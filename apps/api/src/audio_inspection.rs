//! Server-side inspection of untrusted audio bytes. This is not a compliance decision.
use std::io::Cursor;

/// Technical resource limit for the inspector, not an event policy.
pub const MAX_WAV_BYTES: usize = 25 * 1024 * 1024;

#[derive(Debug, PartialEq, Eq)]
pub struct WavMetadata {
    pub channels: u16,
    pub sample_rate: u32,
    pub bits_per_sample: u16,
    pub frames: u64,
    /// Rounded up, so a partial millisecond is not lost in a duration check.
    pub duration_ms: u64,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Mp3Metadata {
    pub channels: u16,
    pub sample_rate: u32,
    pub frames: u64,
    pub duration_ms: u64,
}

#[derive(Debug, PartialEq, Eq)]
pub struct AudioMetadata {
    pub format: &'static str,
    pub content_type: &'static str,
    pub channels: u16,
    pub sample_rate: u32,
    pub bits_per_sample: Option<u16>,
    pub duration_ms: u64,
}

pub fn inspect_audio(bytes: &[u8], content_type: &str) -> Result<AudioMetadata, &'static str> {
    match content_type {
        "audio/wav" => {
            let info = inspect_wav(bytes)?;
            Ok(AudioMetadata {
                format: "wav",
                content_type: "audio/wav",
                channels: info.channels,
                sample_rate: info.sample_rate,
                bits_per_sample: Some(info.bits_per_sample),
                duration_ms: info.duration_ms,
            })
        }
        "audio/mpeg" => {
            let info = inspect_mp3(bytes)?;
            Ok(AudioMetadata {
                format: "mp3",
                content_type: "audio/mpeg",
                channels: info.channels,
                sample_rate: info.sample_rate,
                bits_per_sample: None,
                duration_ms: info.duration_ms,
            })
        }
        _ => Err("Unsupported audio content type"),
    }
}

/// Decode a bounded MP3 stream and count actual output frames. Container tags
/// and client-reported duration are not used as the measurement source.
pub fn inspect_mp3(bytes: &[u8]) -> Result<Mp3Metadata, &'static str> {
    use symphonia::core::{
        codecs::{audio::well_known::CODEC_ID_MP3, audio::AudioDecoderOptions},
        formats::{probe::Hint, FormatOptions, TrackType},
        io::MediaSourceStream,
        meta::MetadataOptions,
    };

    if bytes.len() > MAX_WAV_BYTES || bytes.len() < 128 {
        return Err("Invalid MP3 size");
    }
    let stream = MediaSourceStream::new(Box::new(Cursor::new(bytes.to_vec())), Default::default());
    let mut hint = Hint::new();
    hint.with_extension("mp3");
    let probed = symphonia::default::get_probe()
        .probe(
            &hint,
            stream,
            FormatOptions::default(),
            MetadataOptions::default(),
        )
        .map_err(|_| "Invalid MP3 stream")?;
    let mut reader = probed;
    let track = reader
        .default_track(TrackType::Audio)
        .ok_or("Missing MP3 audio track")?;
    let track_id = track.id;
    let parameters = track
        .codec_params
        .as_ref()
        .and_then(|value| value.audio())
        .ok_or("Missing MP3 codec parameters")?
        .clone();
    if parameters.codec != CODEC_ID_MP3 {
        return Err("Unsupported MPEG audio layer");
    }
    let sample_rate = parameters.sample_rate.ok_or("Missing MP3 sample rate")?;
    let channels = parameters
        .channels
        .as_ref()
        .map(|value| value.count())
        .and_then(|value| u16::try_from(value).ok())
        .filter(|value| *value > 0)
        .ok_or("Missing MP3 channel count")?;
    if sample_rate == 0 {
        return Err("Invalid MP3 sample rate");
    }
    let mut decoder = symphonia::default::get_codecs()
        .make_audio_decoder(&parameters, &AudioDecoderOptions::default())
        .map_err(|_| "Unsupported MP3 stream")?;
    let mut frames = 0u64;
    loop {
        let packet = reader.next_packet().map_err(|_| "Invalid MP3 packet")?;
        let Some(packet) = packet else { break };
        if packet.track_id != track_id {
            continue;
        }
        let decoded = decoder.decode(&packet).map_err(|_| "Invalid MP3 frame")?;
        frames = frames
            .checked_add(decoded.frames() as u64)
            .ok_or("Invalid MP3 duration")?;
    }
    if frames == 0 {
        return Err("Empty MP3 stream");
    }
    let duration_ms = frames
        .checked_mul(1000)
        .ok_or("Invalid MP3 duration")?
        .div_ceil(u64::from(sample_rate));
    Ok(Mp3Metadata {
        channels,
        sample_rate,
        frames,
        duration_ms,
    })
}

/// Inspect a complete little-endian RIFF/WAVE PCM or IEEE-float file.
/// Compressed WAV, MP3, RF64 and extensible WAV need separate decoders.
pub fn inspect_wav(bytes: &[u8]) -> Result<WavMetadata, &'static str> {
    if bytes.len() > MAX_WAV_BYTES || bytes.len() < 12 {
        return Err("Invalid WAV size");
    }
    if &bytes[..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("Invalid WAV header");
    }
    let riff_size = u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize;
    if riff_size.checked_add(8) != Some(bytes.len()) {
        return Err("Invalid RIFF length");
    }
    let mut pos = 12usize;
    let mut format = None;
    let mut data_len = None;
    while pos < bytes.len() {
        let header_end = pos.checked_add(8).ok_or("Invalid chunk")?;
        if header_end > bytes.len() {
            return Err("Truncated chunk header");
        }
        let id = &bytes[pos..pos + 4];
        let size = u32::from_le_bytes(bytes[pos + 4..header_end].try_into().unwrap()) as usize;
        let end = header_end.checked_add(size).ok_or("Invalid chunk size")?;
        let padded_end = end.checked_add(size % 2).ok_or("Invalid chunk size")?;
        if padded_end > bytes.len() {
            return Err("Truncated chunk");
        }
        if id == b"fmt " {
            if format.is_some() || size < 16 {
                return Err("Invalid format chunk");
            }
            let f = &bytes[header_end..end];
            let encoding = u16::from_le_bytes(f[0..2].try_into().unwrap());
            let channels = u16::from_le_bytes(f[2..4].try_into().unwrap());
            let sample_rate = u32::from_le_bytes(f[4..8].try_into().unwrap());
            let byte_rate = u32::from_le_bytes(f[8..12].try_into().unwrap());
            let alignment = u16::from_le_bytes(f[12..14].try_into().unwrap());
            let bits = u16::from_le_bytes(f[14..16].try_into().unwrap());
            if !matches!((encoding, bits), (1, 8 | 16 | 24 | 32) | (3, 32 | 64))
                || channels == 0
                || sample_rate == 0
            {
                return Err("Unsupported WAV format");
            }
            let expected = u32::from(channels) * u32::from(bits / 8);
            if u32::from(alignment) != expected
                || sample_rate.checked_mul(expected) != Some(byte_rate)
            {
                return Err("Inconsistent WAV format");
            }
            format = Some((channels, sample_rate, bits, alignment));
        } else if id == b"data" && data_len.replace(size).is_some() {
            return Err("Multiple data chunks are unsupported");
        }
        pos = padded_end;
    }
    let (channels, sample_rate, bits, alignment) = format.ok_or("Missing WAV format")?;
    let data_len = data_len.ok_or("Missing WAV data")?;
    if data_len == 0 || data_len % usize::from(alignment) != 0 {
        return Err("Invalid WAV frame data");
    }
    let frames = (data_len / usize::from(alignment)) as u64;
    let duration_ms = (frames * 1000).div_ceil(u64::from(sample_rate));
    Ok(WavMetadata {
        channels,
        sample_rate,
        bits_per_sample: bits,
        frames,
        duration_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wav(frames: u32) -> Vec<u8> {
        let size = frames * 4;
        let mut bytes = Vec::new();
        bytes.extend(b"RIFF");
        bytes.extend((36 + size).to_le_bytes());
        bytes.extend(b"WAVEfmt ");
        bytes.extend(16u32.to_le_bytes());
        bytes.extend(1u16.to_le_bytes());
        bytes.extend(2u16.to_le_bytes());
        bytes.extend(1000u32.to_le_bytes());
        bytes.extend(4000u32.to_le_bytes());
        bytes.extend(4u16.to_le_bytes());
        bytes.extend(16u16.to_le_bytes());
        bytes.extend(b"data");
        bytes.extend(size.to_le_bytes());
        bytes.resize((44 + size) as usize, 0);
        bytes
    }

    #[test]
    fn measures_frames_from_data_not_filename_or_client_metadata() {
        assert_eq!(
            inspect_wav(&wav(1001)).unwrap(),
            WavMetadata {
                channels: 2,
                sample_rate: 1000,
                bits_per_sample: 16,
                frames: 1001,
                duration_ms: 1001
            }
        );
    }

    #[test]
    fn rejects_truncation_inconsistent_headers_and_empty_data() {
        let mut short = wav(1);
        short.pop();
        assert!(inspect_wav(&short).is_err());
        let mut wrong_rate = wav(1);
        wrong_rate[28] = 0;
        assert!(inspect_wav(&wrong_rate).is_err());
        let mut compressed = wav(1);
        compressed[20] = 2;
        assert!(inspect_wav(&compressed).is_err());
        assert!(inspect_wav(&wav(0)).is_err());
        assert!(inspect_wav(b"not audio").is_err());
    }

    #[test]
    fn rejects_multiple_or_misaligned_data_chunks() {
        let mut extra = wav(1);
        extra.extend(b"data\x00\x00\x00\x00");
        let length = (extra.len() - 8) as u32;
        extra[4..8].copy_from_slice(&length.to_le_bytes());
        assert!(inspect_wav(&extra).is_err());
        let mut misaligned = wav(1);
        misaligned[40..44].copy_from_slice(&3u32.to_le_bytes());
        assert!(inspect_wav(&misaligned).is_err());
    }
}
