use crate::{
    domain::{VerificationCase, VerificationPurpose, VerificationStatus},
    registration::{authenticate, AppState, PageQuery},
};
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;
#[cfg(feature = "firestore")]
use sha2::{Digest, Sha256};
#[cfg(feature = "firestore")]
use std::{io::Cursor, mem::size_of, process::Stdio, sync::Arc, time::Duration};
#[cfg(feature = "firestore")]
use tokio::sync::Semaphore;

// Do not overlap raster decoding with PDF parsing; both can have substantial peaks.
#[cfg(feature = "firestore")]
static DOCUMENT_VALIDATION_SEMAPHORE: std::sync::OnceLock<Arc<Semaphore>> =
    std::sync::OnceLock::new();
// Bound concurrent buffered uploads as well as parser work; the parser semaphore
// alone is acquired too late to prevent multiple 10 MiB objects being resident.
#[cfg(feature = "firestore")]
static DOCUMENT_SUBMISSION_SEMAPHORE: std::sync::OnceLock<Arc<Semaphore>> =
    std::sync::OnceLock::new();
#[cfg(feature = "firestore")]
static PDF_OBJECT_BUDGET: std::sync::Mutex<(usize, usize, bool)> =
    std::sync::Mutex::new((0, 0, false));

#[cfg(all(test, feature = "firestore"))]
mod document_tests {
    use super::*;
    use lopdf::{dictionary, Document, Object};
    static PDF_TEST_MUTEX: std::sync::Mutex<()> = std::sync::Mutex::new(());

    #[tokio::test]
    async fn valid_pdf_keeps_catalog_and_pages_through_budget_filter() {
        let _guard = PDF_TEST_MUTEX.lock().unwrap();
        let mut document = Document::with_version("1.4");
        let pages = document.new_object_id();
        let page = document.add_object(dictionary! {
            "Type" => "Page", "Parent" => pages,
            "MediaBox" => vec![0.into(), 0.into(), 200.into(), 200.into()]
        });
        document.objects.insert(
            pages,
            Object::Dictionary(dictionary! {
                "Type" => "Pages", "Kids" => vec![Object::Reference(page)], "Count" => 1
            }),
        );
        let catalog = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages });
        document.trailer.set("Root", catalog);
        let mut bytes = Vec::new();
        document.save_to(&mut bytes).unwrap();
        assert_eq!(parse_document_pdf(&bytes), Ok(()));
    }

    #[tokio::test]
    async fn header_only_pdf_is_rejected() {
        let _guard = PDF_TEST_MUTEX.lock().unwrap();
        assert_eq!(
            parse_document_pdf(b"%PDF-1.4\nSynthetic document\n%%EOF\n"),
            Err(StatusCode::UNPROCESSABLE_ENTITY)
        );
    }

    #[test]
    fn valid_raster_is_decoded_within_pixel_limits() {
        let mut png = Cursor::new(Vec::new());
        image::DynamicImage::new_rgb8(2, 2)
            .write_to(&mut png, image::ImageFormat::Png)
            .unwrap();
        assert_eq!(parse_document_raster("image/png", png.get_ref()), Ok(()));
    }
}

#[cfg(feature = "firestore")]
fn estimate_pdf_object_memory(object: &lopdf::Object, depth: usize) -> Option<usize> {
    const MAX_NESTING: usize = 64;
    const NODE_OVERHEAD: usize = 64;
    if depth > MAX_NESTING {
        return None;
    }
    let node = size_of::<lopdf::Object>().checked_add(NODE_OVERHEAD)?;
    let child_bytes = match object {
        lopdf::Object::Name(value) | lopdf::Object::String(value, _) => value.len(),
        lopdf::Object::Array(values) => values.iter().try_fold(
            values.capacity().checked_mul(size_of::<lopdf::Object>())?,
            |total, value| total.checked_add(estimate_pdf_object_memory(value, depth + 1)?),
        )?,
        lopdf::Object::Dictionary(dictionary) => {
            dictionary.iter().try_fold(0usize, |total, (key, value)| {
                total
                    .checked_add(key.len())?
                    .checked_add(estimate_pdf_object_memory(value, depth + 1)?)
            })?
        }
        lopdf::Object::Stream(stream) => {
            stream
                .content
                .len()
                .checked_add(estimate_pdf_object_memory(
                    &lopdf::Object::Dictionary(stream.dict.clone()),
                    depth + 1,
                )?)?
        }
        _ => 0,
    };
    node.checked_add(child_bytes)
}

#[cfg(feature = "firestore")]
fn filter_pdf_object(
    object_id: lopdf::ObjectId,
    object: &mut lopdf::Object,
) -> Option<(lopdf::ObjectId, lopdf::Object)> {
    const MAX_ESTIMATED_OBJECT_MEMORY: usize = 24 * 1024 * 1024;
    const MAX_OBJECT_COUNT: usize = 100_000;
    let size = estimate_pdf_object_memory(object, 0);
    let Ok(mut budget) = PDF_OBJECT_BUDGET.lock() else {
        return None;
    };
    let Some(size) = size else {
        budget.2 = true;
        return None;
    };
    let Some(total) = budget.0.checked_add(size) else {
        budget.2 = true;
        return None;
    };
    let Some(count) = budget.1.checked_add(1) else {
        budget.2 = true;
        return None;
    };
    if total > MAX_ESTIMATED_OBJECT_MEMORY || count > MAX_OBJECT_COUNT {
        budget.2 = true;
        return None;
    }
    budget.0 = total;
    budget.1 = count;
    // lopdf keeps the mutated input for ordinary objects and consumes the
    // returned object for compressed objects. Moving out here turns ordinary
    // catalog/page objects into Null and rejects otherwise valid PDFs.
    Some((object_id, object.clone()))
}

#[derive(Deserialize)]
pub struct CreateVerificationPayload {
    pub purpose: VerificationPurpose,
    pub operation_id: String,
}

#[derive(Deserialize)]
pub struct ReviewVerificationPayload {
    pub status: VerificationStatus,
    pub note: Option<String>,
    pub operation_id: String,
}

#[derive(Deserialize)]
#[cfg(feature = "firestore")]
struct StorageObjectMetadata {
    name: String,
    bucket: String,
    #[serde(rename = "contentType")]
    content_type: String,
    size: String,
}

#[cfg(feature = "firestore")]
fn encode_path(value: &str) -> String {
    value.bytes().fold(String::new(), |mut encoded, byte| {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
        encoded
    })
}

#[cfg(feature = "firestore")]
async fn storage_metadata(path: &str, token: &str) -> Result<StorageObjectMetadata, StatusCode> {
    if token.is_empty() || token.len() > 8192 || token.chars().any(char::is_control) {
        return Err(StatusCode::UNAUTHORIZED);
    }
    let project = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into());
    if project != "demo-wsb"
        && std::env::var("WSB_ALLOW_PRODUCTION_STORAGE").as_deref() != Ok("true")
    {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    let bucket = std::env::var("FIREBASE_STORAGE_BUCKET")
        .unwrap_or_else(|_| format!("{project}.appspot.com"));
    let origin = std::env::var("WSB_STORAGE_API_ORIGIN")
        .unwrap_or_else(|_| "https://firebasestorage.googleapis.com".into());
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    let response = client
        .get(format!(
            "{}/v0/b/{}/o/{}",
            origin.trim_end_matches('/'),
            bucket,
            encode_path(path)
        ))
        .header("Authorization", format!("Firebase {token}"))
        .send()
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    if response.status() == reqwest::StatusCode::UNAUTHORIZED
        || response.status() == reqwest::StatusCode::FORBIDDEN
    {
        return Err(StatusCode::FORBIDDEN);
    }
    if !response.status().is_success() {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    response.json().await.map_err(|_| StatusCode::BAD_GATEWAY)
}

#[cfg(feature = "firestore")]
async fn storage_object_bytes(path: &str, token: &str) -> Result<Vec<u8>, StatusCode> {
    if token.is_empty() || token.len() > 8192 || token.chars().any(char::is_control) {
        return Err(StatusCode::UNAUTHORIZED);
    }
    let project = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into());
    if project != "demo-wsb"
        && std::env::var("WSB_ALLOW_PRODUCTION_STORAGE").as_deref() != Ok("true")
    {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    let bucket = std::env::var("FIREBASE_STORAGE_BUCKET")
        .unwrap_or_else(|_| format!("{project}.appspot.com"));
    let origin = std::env::var("WSB_STORAGE_API_ORIGIN")
        .unwrap_or_else(|_| "https://firebasestorage.googleapis.com".into());
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    let mut response = client
        .get(format!(
            "{}/v0/b/{}/o/{}?alt=media",
            origin.trim_end_matches('/'),
            bucket,
            encode_path(path)
        ))
        .header("Authorization", format!("Firebase {token}"))
        .send()
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    if response.status() == reqwest::StatusCode::UNAUTHORIZED
        || response.status() == reqwest::StatusCode::FORBIDDEN
    {
        return Err(StatusCode::FORBIDDEN);
    }
    if !response.status().is_success() {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    const MAX_DOCUMENT_BYTES: usize = 10 * 1024 * 1024;
    if response
        .content_length()
        .is_some_and(|length| length > MAX_DOCUMENT_BYTES as u64)
    {
        return Err(StatusCode::PAYLOAD_TOO_LARGE);
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?
    {
        if bytes
            .len()
            .checked_add(chunk.len())
            .is_none_or(|length| length > MAX_DOCUMENT_BYTES)
        {
            return Err(StatusCode::PAYLOAD_TOO_LARGE);
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}

#[cfg(feature = "firestore")]
fn matches_document_signature(content_type: &str, bytes: &[u8]) -> bool {
    match content_type {
        "application/pdf" => {
            bytes.len() >= 15
                && bytes
                    .get(..bytes.len().min(1024))
                    .is_some_and(|head| head.windows(5).any(|window| window == b"%PDF-"))
                && bytes
                    .get(bytes.len().saturating_sub(2048)..)
                    .is_some_and(|tail| tail.windows(5).any(|window| window == b"%%EOF"))
        }
        "image/jpeg" => {
            bytes.len() >= 4
                && bytes.starts_with(&[0xff, 0xd8, 0xff])
                && bytes.ends_with(&[0xff, 0xd9])
        }
        "image/png" => {
            bytes.len() >= 45
                && bytes.starts_with(b"\x89PNG\r\n\x1a\n")
                && bytes.get(12..16) == Some(b"IHDR")
                && bytes.get(bytes.len() - 8..bytes.len() - 4) == Some(b"IEND")
        }
        _ => false,
    }
}

#[cfg(feature = "firestore")]
fn parse_document_pdf(bytes: &[u8]) -> Result<(), StatusCode> {
    const MAX_DECOMPRESSED_STREAM: usize = 8 * 1024 * 1024;
    *PDF_OBJECT_BUDGET
        .lock()
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)? = (0, 0, false);
    let loaded = lopdf::Document::load_mem_with_options(
        bytes,
        lopdf::LoadOptions {
            strict: true,
            max_decompressed_size: Some(MAX_DECOMPRESSED_STREAM),
            filter: Some(filter_pdf_object),
            ..Default::default()
        },
    );
    if PDF_OBJECT_BUDGET
        .lock()
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?
        .2
    {
        return Err(StatusCode::PAYLOAD_TOO_LARGE);
    }
    let document = loaded.map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)?;
    let catalog = document
        .catalog()
        .map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)?;
    if !catalog.has_type(b"Catalog")
        || !catalog
            .get_deref(b"Pages", &document)
            .and_then(lopdf::Object::as_dict)
            .is_ok_and(|pages| pages.has_type(b"Pages") && pages.has(b"Kids"))
    {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    Ok(())
}

#[cfg(feature = "firestore")]
fn parse_document_raster(content_type: &str, bytes: &[u8]) -> Result<(), StatusCode> {
    const MAX_DIMENSION: u32 = 4096;
    const MAX_PIXELS: u64 = 16_777_216;
    const MAX_DECODE_ALLOCATION: u64 = 96 * 1024 * 1024;
    let format = match content_type {
        "image/jpeg" => image::ImageFormat::Jpeg,
        "image/png" => image::ImageFormat::Png,
        _ => return Err(StatusCode::UNSUPPORTED_MEDIA_TYPE),
    };
    let dimension_reader = image::ImageReader::with_format(Cursor::new(bytes), format);
    let (width, height) = dimension_reader
        .into_dimensions()
        .map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)?;
    if width == 0
        || height == 0
        || width > MAX_DIMENSION
        || height > MAX_DIMENSION
        || u64::from(width).saturating_mul(u64::from(height)) > MAX_PIXELS
    {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(MAX_DIMENSION);
    limits.max_image_height = Some(MAX_DIMENSION);
    limits.max_alloc = Some(MAX_DECODE_ALLOCATION);
    let mut image_reader = image::ImageReader::with_format(Cursor::new(bytes), format);
    image_reader.limits(limits);
    image_reader
        .decode()
        .map(|_| ())
        .map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)
}

#[cfg(feature = "firestore")]
pub fn document_parser_worker() -> i32 {
    use std::io::Read;

    const MAX_DOCUMENT_BYTES: u64 = 10 * 1024 * 1024;
    let mut bytes = Vec::new();
    if std::io::stdin()
        .take(MAX_DOCUMENT_BYTES + 1)
        .read_to_end(&mut bytes)
        .is_err()
    {
        return 70;
    }
    if bytes.len() as u64 > MAX_DOCUMENT_BYTES {
        return 3;
    }
    let content_type = std::env::args().nth(2);
    let result = match content_type.as_deref() {
        Some("application/pdf") => parse_document_pdf(&bytes),
        Some("image/jpeg") | Some("image/png") => {
            parse_document_raster(content_type.as_deref().unwrap(), &bytes)
        }
        _ => return 64,
    };
    match result {
        Ok(()) => 0,
        Err(StatusCode::PAYLOAD_TOO_LARGE) => 3,
        Err(StatusCode::UNPROCESSABLE_ENTITY) => 2,
        Err(_) => 70,
    }
}

#[cfg(feature = "firestore")]
async fn validate_document_pdf(bytes: Arc<[u8]>) -> Result<(), StatusCode> {
    run_document_parser("application/pdf", bytes).await
}

#[cfg(feature = "firestore")]
async fn run_document_parser(content_type: &str, bytes: Arc<[u8]>) -> Result<(), StatusCode> {
    let executable = std::env::var_os("WSB_DOCUMENT_PARSER_PATH")
        .map(std::path::PathBuf::from)
        .map(Ok)
        .unwrap_or_else(std::env::current_exe)
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    run_document_parser_with(content_type, bytes, executable, Duration::from_secs(30)).await
}

#[cfg(feature = "firestore")]
async fn run_document_parser_with(
    content_type: &str,
    bytes: Arc<[u8]>,
    executable: std::path::PathBuf,
    parse_timeout: Duration,
) -> Result<(), StatusCode> {
    let content_type = content_type.to_owned();
    let deadline = tokio::time::Instant::now() + parse_timeout;
    let semaphore = DOCUMENT_VALIDATION_SEMAPHORE
        .get_or_init(|| Arc::new(Semaphore::new(1)))
        .clone();
    let permit = tokio::time::timeout_at(deadline, semaphore.acquire_owned())
        .await
        .map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)?
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    // Keep cleanup and the parser permit alive if the requesting future is cancelled.
    tokio::spawn(async move {
        let _permit = permit;
        run_document_parser_owned(content_type, bytes, executable, deadline).await
    })
    .await
    .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?
}

#[cfg(feature = "firestore")]
async fn run_document_parser_owned(
    content_type: String,
    bytes: Arc<[u8]>,
    executable: std::path::PathBuf,
    deadline: tokio::time::Instant,
) -> Result<(), StatusCode> {
    let mut command = tokio::process::Command::new(executable);
    command
        .arg("--document-parser")
        .arg(&content_type)
        .env_clear()
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true);

    #[cfg(target_os = "linux")]
    unsafe {
        use std::os::unix::process::CommandExt;
        command.as_std_mut().pre_exec(|| {
            let memory_limit = libc::rlimit {
                rlim_cur: 512 * 1024 * 1024,
                rlim_max: 512 * 1024 * 1024,
            };
            if libc::setrlimit(libc::RLIMIT_AS, &memory_limit) != 0 {
                return Err(std::io::Error::last_os_error());
            }
            let cpu_limit = libc::rlimit {
                rlim_cur: 20,
                rlim_max: 25,
            };
            if libc::setrlimit(libc::RLIMIT_CPU, &cpu_limit) != 0 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }

    let mut child = command
        .spawn()
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    let result = tokio::time::timeout_at(deadline, async {
        let mut stdin = child.stdin.take().ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
        tokio::io::AsyncWriteExt::write_all(&mut stdin, &bytes)
            .await
            .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        drop(stdin);
        child
            .wait()
            .await
            .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)
    })
    .await;
    let status = match result {
        Ok(Ok(status)) => status,
        Ok(Err(error)) => {
            let _ = child.kill().await;
            return Err(error);
        }
        Err(_) => {
            let _ = child.kill().await;
            return Err(StatusCode::UNPROCESSABLE_ENTITY);
        }
    };
    match status.code() {
        Some(0) => Ok(()),
        Some(3) | None => Err(StatusCode::PAYLOAD_TOO_LARGE),
        Some(2) => Err(StatusCode::UNPROCESSABLE_ENTITY),
        _ => Err(StatusCode::SERVICE_UNAVAILABLE),
    }
}

#[cfg(feature = "firestore")]
async fn validate_document_raster(content_type: &str, bytes: Arc<[u8]>) -> Result<(), StatusCode> {
    if !matches!(content_type, "image/jpeg" | "image/png") {
        return Err(StatusCode::UNSUPPORTED_MEDIA_TYPE);
    }
    run_document_parser(content_type, bytes).await
}

#[cfg(all(test, feature = "firestore", target_os = "linux"))]
mod parser_launch_tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    #[tokio::test]
    async fn parent_applies_limits_and_terminates_a_stuck_worker() {
        let dir = std::env::temp_dir().join(format!(
            "wsb-parser-launch-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir(&dir).unwrap();
        let worker = dir.join("worker");
        std::fs::write(
            &worker,
            "#!/bin/sh\n[ \"$(ulimit -v)\" = 524288 ] && [ \"$(ulimit -t)\" = 20 ]\n",
        )
        .unwrap();
        std::fs::set_permissions(&worker, std::fs::Permissions::from_mode(0o700)).unwrap();
        let empty: Arc<[u8]> = Arc::from(&b""[..]);
        assert_eq!(
            run_document_parser_with(
                "application/pdf",
                empty.clone(),
                worker.clone(),
                Duration::from_secs(5)
            )
            .await,
            Ok(())
        );
        let pid_file = dir.join("pid");
        std::fs::write(
            &worker,
            format!(
                "#!/bin/sh\necho $$ > '{}'\nwhile :; do :; done\n",
                pid_file.display()
            ),
        )
        .unwrap();
        let start = std::time::Instant::now();
        assert_eq!(
            run_document_parser_with(
                "application/pdf",
                empty.clone(),
                worker.clone(),
                Duration::from_millis(200)
            )
            .await,
            Err(StatusCode::UNPROCESSABLE_ENTITY)
        );
        assert!(start.elapsed() < Duration::from_secs(5));
        let pid: libc::pid_t = std::fs::read_to_string(&pid_file)
            .unwrap()
            .trim()
            .parse()
            .unwrap();
        assert_eq!(
            unsafe { libc::kill(pid, 0) },
            -1,
            "timed-out worker must be reaped before the permit is released"
        );
        assert_eq!(
            std::io::Error::last_os_error().raw_os_error(),
            Some(libc::ESRCH)
        );
        std::fs::write(&worker, "#!/bin/sh\nexit 0\n").unwrap();
        assert_eq!(
            run_document_parser_with(
                "application/pdf",
                empty.clone(),
                worker.clone(),
                Duration::from_secs(5)
            )
            .await,
            Ok(()),
            "the semaphore is released after timeout"
        );
        std::fs::remove_file(&pid_file).unwrap();
        std::fs::write(
            &worker,
            format!(
                "#!/bin/sh\necho $$ > '{}'\nwhile :; do :; done\n",
                pid_file.display()
            ),
        )
        .unwrap();
        let cancelled_worker = worker.clone();
        let cancelled = tokio::spawn(async move {
            run_document_parser_with(
                "application/pdf",
                empty,
                cancelled_worker,
                Duration::from_millis(500),
            )
            .await
        });
        tokio::time::timeout(Duration::from_secs(5), async {
            while !pid_file.exists() {
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
        let cancelled_pid: libc::pid_t = std::fs::read_to_string(&pid_file)
            .unwrap()
            .trim()
            .parse()
            .unwrap();
        cancelled.abort();
        let replacement = dir.join("replacement");
        std::fs::write(&replacement, "#!/bin/sh\nexit 0\n").unwrap();
        std::fs::set_permissions(&replacement, std::fs::Permissions::from_mode(0o700)).unwrap();
        assert_eq!(
            run_document_parser_with(
                "application/pdf",
                Arc::from(&b""[..]),
                replacement,
                Duration::from_secs(5)
            )
            .await,
            Ok(())
        );
        assert_eq!(
            unsafe { libc::kill(cancelled_pid, 0) },
            -1,
            "cancelled request must not release the permit before its worker is reaped"
        );
        assert_eq!(
            std::io::Error::last_os_error().raw_os_error(),
            Some(libc::ESRCH)
        );
        std::fs::remove_dir_all(dir).unwrap();
    }
}

pub async fn list(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
    Query(query): Query<PageQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .verification_cases(&claims, &chapter, query.cursor, query.limit.unwrap_or(30))
            .await
            .map(|page| Json(serde_json::json!(page)))
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn create(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateVerificationPayload>,
) -> Result<Json<VerificationCase>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .create_verification_case(&claims, &chapter, payload.purpose, &payload.operation_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn submit(
    State(state): State<AppState>,
    Path((chapter, case_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<VerificationCase>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let value = repository
            .verification_upload_case(&claims, &chapter, &case_id)
            .await
            .map_err(StatusCode::from)?;
        let token = headers
            .get("x-firebase-id-token")
            .and_then(|v| v.to_str().ok())
            .ok_or(StatusCode::UNAUTHORIZED)?;
        let metadata = storage_metadata(&value.storage_path, token).await?;
        let expected_bucket = std::env::var("FIREBASE_STORAGE_BUCKET").unwrap_or_else(|_| {
            format!(
                "{}.appspot.com",
                std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into())
            )
        });
        if metadata.name != value.storage_path || metadata.bucket != expected_bucket {
            return Err(StatusCode::FORBIDDEN);
        }
        let size_bytes = metadata
            .size
            .parse()
            .map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)?;
        if size_bytes == 0 || size_bytes > 10 * 1024 * 1024 {
            return Err(StatusCode::PAYLOAD_TOO_LARGE);
        }
        let submission_semaphore = DOCUMENT_SUBMISSION_SEMAPHORE
            .get_or_init(|| Arc::new(Semaphore::new(1)))
            .clone();
        let _submission_permit = tokio::time::timeout(
            Duration::from_secs(30),
            submission_semaphore.acquire_owned(),
        )
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        let bytes: Arc<[u8]> = storage_object_bytes(&value.storage_path, token)
            .await?
            .into();
        if bytes.len() as u64 != size_bytes
            || !matches_document_signature(&metadata.content_type, &bytes)
        {
            return Err(StatusCode::UNPROCESSABLE_ENTITY);
        }
        if matches!(metadata.content_type.as_str(), "image/jpeg" | "image/png") {
            validate_document_raster(&metadata.content_type, Arc::clone(&bytes)).await?;
        } else if metadata.content_type == "application/pdf" {
            validate_document_pdf(Arc::clone(&bytes)).await?;
        }
        match crate::malware_scan::require_clean(&bytes).await {
            Ok(()) => {}
            Err(crate::malware_scan::ScanError::Infected) => {
                return Err(StatusCode::UNPROCESSABLE_ENTITY);
            }
            Err(crate::malware_scan::ScanError::Unavailable) => {
                return Err(StatusCode::SERVICE_UNAVAILABLE);
            }
            Err(crate::malware_scan::ScanError::InvalidSize) => {
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }
        }
        let file_sha256 = Sha256::digest(bytes.as_ref())
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        return repository
            .submit_verification_case(
                &claims,
                &chapter,
                &case_id,
                &metadata.content_type,
                size_bytes,
                &file_sha256,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, case_id);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn review(
    State(state): State<AppState>,
    Path((chapter, case_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<ReviewVerificationPayload>,
) -> Result<Json<VerificationCase>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let case = repository
            .verification_review_case(&claims, &chapter, &case_id)
            .await
            .map_err(StatusCode::from)?;
        // A completed review removes the reviewer's Storage read permission.
        // Recover its authorized receipt before trying to read file metadata.
        // The repository rejects a new operation on a completed case.
        if case.status != VerificationStatus::Pending {
            return repository
                .review_verification_case(
                    &claims,
                    &chapter,
                    &case_id,
                    payload.status,
                    payload.note,
                    &payload.operation_id,
                )
                .await
                .map(Json)
                .map_err(StatusCode::from);
        }
        let token = headers
            .get("x-firebase-id-token")
            .and_then(|v| v.to_str().ok())
            .ok_or(StatusCode::UNAUTHORIZED)?;
        let metadata = storage_metadata(&case.storage_path, token).await?;
        let expected_bucket = std::env::var("FIREBASE_STORAGE_BUCKET").unwrap_or_else(|_| {
            format!(
                "{}.appspot.com",
                std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into())
            )
        });
        if metadata.name != case.storage_path
            || metadata.bucket != expected_bucket
            || case.content_type.as_deref() != Some(&metadata.content_type)
            || case.size_bytes != metadata.size.parse::<u64>().ok()
        {
            return Err(StatusCode::UNPROCESSABLE_ENTITY);
        }
        return repository
            .review_verification_case(
                &claims,
                &chapter,
                &case_id,
                payload.status,
                payload.note,
                &payload.operation_id,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, case_id, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}
