//! PayMongo signature verification primitives. No payment is settled here.
use crate::store::{constant_time_eq, hmac_sha256};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmulatedCheckout {
    pub session_id: String,
    pub reference: String,
    pub amount_minor: u64,
}

#[cfg(feature = "local-testing")]
pub async fn expire_emulated_checkout(
    session_id: &str,
    reference: &str,
    amount_minor: u64,
) -> Result<(), &'static str> {
    if std::env::var("WSB_LOCAL_TESTING").as_deref() != Ok("true")
        || std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
        || std::env::var("FIRESTORE_EMULATOR_HOST").is_err()
        || !session_id.starts_with("cs_")
        || session_id.len() > 200
        || !session_id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_')
    {
        return Err("Local checkout unavailable");
    }
    let response = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|_| "Local checkout unavailable")?
        .post(format!(
            "http://paymongo-emulator:8191/v2/checkout_sessions/{session_id}/expire"
        ))
        .send()
        .await
        .map_err(|_| "Local checkout unavailable")?;
    if !response.status().is_success() {
        return Err("Local checkout cannot be expired");
    }
    let value: serde_json::Value = response
        .json()
        .await
        .map_err(|_| "Invalid expiration response")?;
    let data = &value["data"];
    if data["id"] != session_id
        || data["type"] != "checkout_session"
        || data["attributes"]["status"] != "expired"
        || data["attributes"]["livemode"] != false
        || data["attributes"]["reference_number"] != reference
        || data["attributes"]["amount"].as_u64() != Some(amount_minor)
        || data["attributes"]["currency"] != "PHP"
    {
        return Err("Invalid expiration response");
    }
    Ok(())
}

/// Local-only adapter. A returned session is not proof of payment.
#[cfg(feature = "local-testing")]
pub async fn create_emulated_checkout(
    origin: &str,
    operation_id: &str,
    reference: &str,
    amount_minor: u64,
) -> Result<EmulatedCheckout, &'static str> {
    if std::env::var("WSB_LOCAL_TESTING").as_deref() != Ok("true")
        || std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
        || std::env::var("FIRESTORE_EMULATOR_HOST").is_err()
        || !matches!(
            origin,
            "http://paymongo-emulator:8191" | "http://host.docker.internal:8191"
        )
        || operation_id.is_empty()
        || reference.is_empty()
        || amount_minor == 0
    {
        return Err("Local checkout is unavailable");
    }
    let request = serde_json::json!({"data":{"attributes":{
        "reference_number":reference,
        "line_items":[{"name":"WSB registration","amount":amount_minor,"currency":"PHP","quantity":1}]
    }}});
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|_| "Local checkout unavailable")?;
    let response = client
        .post(format!("{origin}/v2/checkout_sessions"))
        .header("idempotency-key", operation_id)
        .json(&request)
        .send()
        .await
        .map_err(|_| "Local checkout unavailable")?;
    if !response.status().is_success() {
        return Err("Local checkout rejected");
    }
    let value: serde_json::Value = response
        .json()
        .await
        .map_err(|_| "Invalid local checkout response")?;
    let data = &value["data"];
    let session_id = data["id"]
        .as_str()
        .filter(|id| {
            id.starts_with("cs_")
                && id.len() <= 200
                && id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'_')
        })
        .ok_or("Invalid local checkout response")?;
    if data["type"] != "checkout_session"
        || data["attributes"]["livemode"] != false
        || data["attributes"]["reference_number"] != reference
        || data["attributes"]["amount"].as_u64() != Some(amount_minor)
        || data["attributes"]["currency"] != "PHP"
        || data["attributes"]["status"] != "active"
    {
        return Err("Invalid local checkout response");
    }
    Ok(EmulatedCheckout {
        session_id: session_id.to_owned(),
        reference: reference.to_owned(),
        amount_minor,
    })
}

/// Verify the raw request body and selected mode against PayMongo's signature.
/// The caller supplies a clock and permitted timestamp skew for its deployment.
pub fn verify_signature(
    header: &str,
    body: &[u8],
    secret: &[u8],
    live: bool,
    now: u64,
    max_skew: u64,
) -> bool {
    if secret.is_empty() {
        return false;
    }
    let mut timestamp = None;
    let mut test = None;
    let mut live_signature = None;
    for pair in header.split(',') {
        let Some((name, value)) = pair.trim().split_once('=') else {
            return false;
        };
        let target = match name {
            "t" => &mut timestamp,
            "te" => &mut test,
            "li" => &mut live_signature,
            _ => return false,
        };
        if target.replace(value).is_some() {
            return false;
        }
    }
    let Some(t) = timestamp else {
        return false;
    };
    if t.is_empty() || !t.bytes().all(|byte| byte.is_ascii_digit()) {
        return false;
    }
    let Ok(time) = t.parse::<u64>() else {
        return false;
    };
    if now.abs_diff(time) > max_skew {
        return false;
    }
    let Some(signature) = (if live { live_signature } else { test }) else {
        return false;
    };
    if signature.len() != 64
        || !signature
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return false;
    }
    let mut message = Vec::with_capacity(t.len() + body.len() + 1);
    message.extend_from_slice(t.as_bytes());
    message.push(b'.');
    message.extend_from_slice(body);
    let expected: String = hmac_sha256(secret, &message)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();
    constant_time_eq(signature.as_bytes(), expected.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(feature = "local-testing")]
    #[tokio::test]
    #[ignore = "requires the local PayMongo emulator and demo-wsb configuration"]
    async fn local_checkout_retries_and_rejects_changed_amount() {
        let id = format!(
            "test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        let first = create_emulated_checkout("http://host.docker.internal:8191", &id, &id, 12500)
            .await
            .unwrap();
        let replay = create_emulated_checkout("http://host.docker.internal:8191", &id, &id, 12500)
            .await
            .unwrap();
        assert_eq!(first, replay);
        assert!(
            create_emulated_checkout("http://host.docker.internal:8191", &id, &id, 12501)
                .await
                .is_err()
        );
        assert!(
            create_emulated_checkout("https://api.paymongo.com", &id, &id, 12500)
                .await
                .is_err()
        );
    }
    #[test]
    fn checks_raw_body_mode_timestamp_and_duplicate_fields() {
        let body = br#"{"data":{"id":"evt_synthetic"}}"#;
        let secret = b"synthetic-test-secret";
        // Independently generated HMAC-SHA256 test vector.
        let sig = "21419428c0c4a75dd57c0b4d577cc1215e9f67593cd6ac80aecd3d4ee09b5fd8";
        let header = format!("t=1000,te={sig},li=");
        assert!(verify_signature(&header, body, secret, false, 1005, 10));
        assert!(!verify_signature(&header, body, secret, true, 1005, 10));
        assert!(!verify_signature(&header, b"{}", secret, false, 1005, 10));
        assert!(!verify_signature(&header, body, secret, false, 1011, 10));
        assert!(!verify_signature(
            &format!("{header},t=1000"),
            body,
            secret,
            false,
            1005,
            10
        ));
        assert!(!verify_signature(&header, body, b"", false, 1005, 10));
    }
}
