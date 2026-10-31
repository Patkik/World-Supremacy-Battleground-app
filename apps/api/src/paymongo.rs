//! PayMongo payment provider integration, signature verification, and hosted checkout.
use crate::store::{constant_time_eq, hmac_sha256};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymongoCheckoutItem {
    pub name: String,
    pub amount: u64,
    pub currency: String,
    pub quantity: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateCheckoutRequest {
    pub reference_number: String,
    pub line_items: Vec<PaymongoCheckoutItem>,
    pub description: Option<String>,
    pub success_url: Option<String>,
    pub cancel_url: Option<String>,
    pub payment_method_types: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymongoCheckoutSession {
    pub id: String,
    pub checkout_url: String,
    pub reference_number: String,
    pub status: String,
    pub amount_minor: u64,
    pub currency: String,
    pub livemode: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateRefundRequest {
    pub payment_id: String,
    pub amount_minor: u64,
    pub reason: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymongoRefund {
    pub id: String,
    pub payment_id: String,
    pub amount_minor: u64,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PaymongoEventType {
    CheckoutSessionPaid,
    PaymentPaid,
    PaymentRefunded,
    Unknown(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymongoPaidPayment {
    pub payment_id: String,
    pub amount_minor: u64,
    pub currency: String,
    pub status: String,
    pub livemode: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymongoEvent {
    pub event_id: String,
    pub event_type: PaymongoEventType,
    pub livemode: bool,
    pub session_id: Option<String>,
    pub reference_number: Option<String>,
    pub payment: Option<PaymongoPaidPayment>,
    pub refund_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmulatedCheckout {
    pub session_id: String,
    pub reference: String,
    pub amount_minor: u64,
}

/// Official PayMongo API client for production and authenticated environments.
#[derive(Debug, Clone)]
pub struct PaymongoClient {
    secret_key: String,
    api_base_url: String,
    client: reqwest::Client,
}

impl PaymongoClient {
    pub fn new(secret_key: String, api_base_url: Option<String>) -> Self {
        let api_base_url = api_base_url
            .unwrap_or_else(|| "https://api.paymongo.com/v1".to_string())
            .trim_end_matches('/')
            .to_string();
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        Self {
            secret_key,
            api_base_url,
            client,
        }
    }

    /// Load client configuration from environment.
    /// Secret keys are never stored in client documents or chapter records.
    pub fn from_env() -> Option<Self> {
        let secret_key = std::env::var("PAYMONGO_SECRET_KEY")
            .ok()
            .filter(|k| k.len() >= 16 && !k.trim().is_empty())?;
        let base_url = std::env::var("PAYMONGO_API_BASE_URL").ok();
        Some(Self::new(secret_key, base_url))
    }

    pub async fn create_checkout_session(
        &self,
        req: &CreateCheckoutRequest,
    ) -> Result<PaymongoCheckoutSession, String> {
        if req.reference_number.is_empty() || req.line_items.is_empty() {
            return Err("Invalid checkout request".to_string());
        }
        let payload = serde_json::json!({
            "data": {
                "attributes": {
                    "reference_number": req.reference_number,
                    "line_items": req.line_items.iter().map(|item| {
                        serde_json::json!({
                            "name": item.name,
                            "amount": item.amount,
                            "currency": item.currency,
                            "quantity": item.quantity,
                        })
                    }).collect::<Vec<_>>(),
                    "payment_method_types": req.payment_method_types,
                    "description": req.description,
                    "success_url": req.success_url,
                    "cancel_url": req.cancel_url,
                    "send_email_receipt": true,
                    "show_description": true,
                    "show_line_items": true,
                }
            }
        });

        let url = format!("{}/checkout_sessions", self.api_base_url);
        let response = self
            .client
            .post(&url)
            .basic_auth(&self.secret_key, Some(""))
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Provider communication error: {e}"))?;

        let status = response.status();
        let body: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Invalid provider JSON: {e}"))?;

        if !status.is_success() {
            let error_detail = body["errors"]
                .as_array()
                .and_then(|arr| arr.first())
                .and_then(|err| err["detail"].as_str())
                .unwrap_or("PayMongo rejected checkout session request");
            return Err(error_detail.to_string());
        }

        let data = &body["data"];
        let id = data["id"].as_str().ok_or("Missing session ID")?.to_string();
        let attrs = &data["attributes"];
        let checkout_url = attrs["checkout_url"]
            .as_str()
            .unwrap_or_default()
            .to_string();
        let reference_number = attrs["reference_number"]
            .as_str()
            .unwrap_or_default()
            .to_string();
        let status = attrs["status"].as_str().unwrap_or("active").to_string();
        let amount_minor = attrs["line_items"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|item| item["amount"].as_u64())
            .or_else(|| attrs["amount"].as_u64())
            .unwrap_or(0);
        let currency = attrs["currency"].as_str().unwrap_or("PHP").to_string();
        let livemode = attrs["livemode"].as_bool().unwrap_or(false);

        Ok(PaymongoCheckoutSession {
            id,
            checkout_url,
            reference_number,
            status,
            amount_minor,
            currency,
            livemode,
        })
    }

    pub async fn expire_checkout_session(&self, session_id: &str) -> Result<(), String> {
        if !session_id.starts_with("cs_") {
            return Err("Invalid checkout session ID".to_string());
        }
        let url = format!("{}/checkout_sessions/{session_id}/expire", self.api_base_url);
        let response = self
            .client
            .post(&url)
            .basic_auth(&self.secret_key, Some(""))
            .send()
            .await
            .map_err(|e| format!("Provider communication error: {e}"))?;

        if !response.status().is_success() {
            return Err("Unable to expire checkout session".to_string());
        }
        Ok(())
    }

    pub async fn create_refund(&self, req: &CreateRefundRequest) -> Result<PaymongoRefund, String> {
        if req.payment_id.is_empty() || req.amount_minor == 0 {
            return Err("Invalid refund request".to_string());
        }
        let payload = serde_json::json!({
            "data": {
                "attributes": {
                    "amount": req.amount_minor,
                    "payment_id": req.payment_id,
                    "reason": req.reason,
                    "notes": req.notes,
                }
            }
        });

        let url = format!("{}/refunds", self.api_base_url);
        let response = self
            .client
            .post(&url)
            .basic_auth(&self.secret_key, Some(""))
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Provider communication error: {e}"))?;

        let status = response.status();
        let body: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Invalid provider JSON: {e}"))?;

        if !status.is_success() {
            let error_detail = body["errors"]
                .as_array()
                .and_then(|arr| arr.first())
                .and_then(|err| err["detail"].as_str())
                .unwrap_or("PayMongo rejected refund request");
            return Err(error_detail.to_string());
        }

        let data = &body["data"];
        let id = data["id"].as_str().ok_or("Missing refund ID")?.to_string();
        let attrs = &data["attributes"];
        let payment_id = attrs["payment_id"].as_str().unwrap_or_default().to_string();
        let amount_minor = attrs["amount"].as_u64().unwrap_or(req.amount_minor);
        let status = attrs["status"].as_str().unwrap_or("succeeded").to_string();

        Ok(PaymongoRefund {
            id,
            payment_id,
            amount_minor,
            status,
        })
    }
}

/// Parse raw PayMongo webhook JSON payload into a structured event.
pub fn parse_event(body: &[u8]) -> Result<PaymongoEvent, String> {
    let root: serde_json::Value = serde_json::from_slice(body).map_err(|e| format!("Malformed JSON: {e}"))?;
    let data = &root["data"];
    let event_id = data["id"].as_str().ok_or("Missing event ID")?.to_string();
    let attrs = &data["attributes"];
    let type_str = attrs["type"].as_str().ok_or("Missing event type")?;
    let livemode = attrs["livemode"].as_bool().unwrap_or(false);
    let inner_data = &attrs["data"];
    let inner_attrs = &inner_data["attributes"];

    match type_str {
        "checkout_session.payment.paid" => {
            let session_id = inner_data["id"].as_str().map(|s| s.to_string());
            let reference_number = inner_attrs["reference_number"].as_str().map(|s| s.to_string());
            let payment = inner_attrs["payments"].as_array().and_then(|payments| {
                payments.iter().find(|p| p["attributes"]["status"] == "paid").map(|p| PaymongoPaidPayment {
                    payment_id: p["id"].as_str().unwrap_or_default().to_string(),
                    amount_minor: p["attributes"]["amount"].as_u64().unwrap_or(0),
                    currency: p["attributes"]["currency"].as_str().unwrap_or("PHP").to_string(),
                    status: "paid".to_string(),
                    livemode: p["attributes"]["livemode"].as_bool().unwrap_or(false),
                })
            });
            Ok(PaymongoEvent {
                event_id,
                event_type: PaymongoEventType::CheckoutSessionPaid,
                livemode,
                session_id,
                reference_number,
                payment,
                refund_id: None,
            })
        }
        "payment.paid" => {
            let payment_id = inner_data["id"].as_str().unwrap_or_default().to_string();
            let amount_minor = inner_attrs["amount"].as_u64().unwrap_or(0);
            let currency = inner_attrs["currency"].as_str().unwrap_or("PHP").to_string();
            let payment = Some(PaymongoPaidPayment {
                payment_id,
                amount_minor,
                currency,
                status: "paid".to_string(),
                livemode,
            });
            Ok(PaymongoEvent {
                event_id,
                event_type: PaymongoEventType::PaymentPaid,
                livemode,
                session_id: None,
                reference_number: None,
                payment,
                refund_id: None,
            })
        }
        "payment.refunded" | "payment.refund.updated" => {
            let payment_id = inner_data["id"].as_str().unwrap_or_default().to_string();
            let amount_minor = inner_attrs["amount"].as_u64().unwrap_or(0);
            let currency = inner_attrs["currency"].as_str().unwrap_or("PHP").to_string();
            let refund_id = inner_attrs["refunds"]
                .as_array()
                .and_then(|arr| arr.first())
                .and_then(|r| r["id"].as_str())
                .map(|s| s.to_string());
            let payment = Some(PaymongoPaidPayment {
                payment_id,
                amount_minor,
                currency,
                status: "refunded".to_string(),
                livemode,
            });
            Ok(PaymongoEvent {
                event_id,
                event_type: PaymongoEventType::PaymentRefunded,
                livemode,
                session_id: None,
                reference_number: None,
                payment,
                refund_id,
            })
        }
        other => Ok(PaymongoEvent {
            event_id,
            event_type: PaymongoEventType::Unknown(other.to_string()),
            livemode,
            session_id: None,
            reference_number: None,
            payment: None,
            refund_id: None,
        }),
    }
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

    #[test]
    fn parses_checkout_session_paid_event() {
        let payload = serde_json::json!({
            "data": {
                "id": "evt_test123",
                "type": "event",
                "attributes": {
                    "type": "checkout_session.payment.paid",
                    "livemode": false,
                    "created_at": 1620000000,
                    "data": {
                        "id": "cs_test456",
                        "type": "checkout_session",
                        "attributes": {
                            "status": "paid",
                            "reference_number": "ref_wsb_789",
                            "payments": [
                                {
                                    "id": "pay_xyz001",
                                    "type": "payment",
                                    "attributes": {
                                        "amount": 15000,
                                        "currency": "PHP",
                                        "status": "paid",
                                        "livemode": false
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        });
        let raw = serde_json::to_vec(&payload).unwrap();
        let event = parse_event(&raw).unwrap();
        assert_eq!(event.event_id, "evt_test123");
        assert_eq!(event.event_type, PaymongoEventType::CheckoutSessionPaid);
        assert_eq!(event.session_id.as_deref(), Some("cs_test456"));
        assert_eq!(event.reference_number.as_deref(), Some("ref_wsb_789"));
        assert!(!event.livemode);
        let payment = event.payment.unwrap();
        assert_eq!(payment.payment_id, "pay_xyz001");
        assert_eq!(payment.amount_minor, 15000);
        assert_eq!(payment.currency, "PHP");
        assert_eq!(payment.status, "paid");
    }

    #[test]
    fn parses_payment_refunded_event() {
        let payload = serde_json::json!({
            "data": {
                "id": "evt_refund123",
                "type": "event",
                "attributes": {
                    "type": "payment.refunded",
                    "livemode": true,
                    "created_at": 1620000100,
                    "data": {
                        "id": "pay_xyz001",
                        "type": "payment",
                        "attributes": {
                            "amount": 15000,
                            "currency": "PHP",
                            "status": "refunded",
                            "refunds": [
                                {
                                    "id": "ref_abc999",
                                    "amount": 15000,
                                    "status": "succeeded"
                                }
                            ]
                        }
                    }
                }
            }
        });
        let raw = serde_json::to_vec(&payload).unwrap();
        let event = parse_event(&raw).unwrap();
        assert_eq!(event.event_id, "evt_refund123");
        assert_eq!(event.event_type, PaymongoEventType::PaymentRefunded);
        assert!(event.livemode);
        let payment = event.payment.unwrap();
        assert_eq!(payment.payment_id, "pay_xyz001");
        assert_eq!(payment.amount_minor, 15000);
        assert_eq!(event.refund_id.as_deref(), Some("ref_abc999"));
    }

    #[test]
    fn client_fails_closed_when_unconfigured() {
        assert!(PaymongoClient::from_env().is_none() || std::env::var("PAYMONGO_SECRET_KEY").is_ok());
    }
}
