//! PayMongo payment provider integration, signature verification, and hosted checkout.
use crate::store::{constant_time_eq, hmac_sha256};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

fn valid_provider_id(value: &str, prefix: &str) -> bool {
    value.len() <= 128
        && value.strip_prefix(prefix).is_some_and(|suffix| {
            !suffix.is_empty()
                && suffix
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        })
}

fn valid_checkout_url(value: &str) -> bool {
    reqwest::Url::parse(value).is_ok_and(|url| {
        let path = url.path();
        let safe_key = path.strip_prefix("/cs_").is_some_and(|suffix| {
            !suffix.is_empty()
                && suffix.len() <= 256
                && suffix
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        });
        url.scheme() == "https"
            && url.host_str() == Some("checkout.paymongo.com")
            && url.port().is_none()
            && url.username().is_empty()
            && url.password().is_none()
            && safe_key
            && url.fragment().is_some_and(|fragment| !fragment.is_empty())
    })
}

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
    /// Stable WSB operation ID reused after timeout or ambiguous provider response.
    pub operation_id: String,
    pub payment_id: String,
    pub amount_minor: u64,
    pub currency: String,
    pub reason: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymongoRefund {
    pub id: String,
    pub payment_id: String,
    pub amount_minor: u64,
    pub currency: String,
    pub livemode: bool,
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
    #[serde(default)]
    pub refunds: Vec<PaymongoRefund>,
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
    api_origin: String,
    client: reqwest::Client,
}

impl PaymongoClient {
    pub fn new(secret_key: String, api_base_url: Option<String>) -> Self {
        let configured = api_base_url.unwrap_or_else(|| "https://api.paymongo.com".to_string());
        let configured = configured.trim_end_matches('/');
        // Accept older deployment values ending in `/v1` or `/v2`, but keep
        // endpoint versions explicit at each call site (refunds remain v1).
        let api_origin = configured
            .strip_suffix("/v1")
            .or_else(|| configured.strip_suffix("/v2"))
            .unwrap_or(configured)
            .trim_end_matches('/')
            .to_string();
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        Self {
            secret_key,
            api_origin,
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
        if req.reference_number.is_empty()
            || req.reference_number.len() > 100
            || req.line_items.is_empty()
            || req.payment_method_types.is_empty()
        {
            return Err("Invalid checkout request".to_string());
        }
        let currency = &req.line_items[0].currency;
        if currency != "PHP"
            || req
                .line_items
                .iter()
                .any(|item| item.currency != *currency || item.amount == 0 || item.quantity == 0)
        {
            return Err(
                "PayMongo hosted checkout currently requires nonzero PHP line items".into(),
            );
        }
        let expected_amount = req
            .line_items
            .iter()
            .try_fold(0_u64, |sum, item| {
                item.amount
                    .checked_mul(item.quantity)
                    .and_then(|amount| sum.checked_add(amount))
            })
            .ok_or("Checkout amount is out of range")?;
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

        let url = format!("{}/v2/checkout_sessions", self.api_origin);
        // The reference is stable for a reservation/operation, so retries after a
        // lost response reuse PayMongo's idempotency window instead of creating
        // another payable session.
        let idempotency_key = format!(
            "wsb-checkout-{}",
            Sha256::digest(req.reference_number.as_bytes())
                .iter()
                .map(|b| format!("{b:02x}"))
                .collect::<String>()
        );
        let response = self
            .client
            .post(&url)
            .basic_auth(&self.secret_key, Some(""))
            .header("Idempotency-Key", idempotency_key)
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
        let id = data["id"]
            .as_str()
            .filter(|id| valid_provider_id(id, "cs_"))
            .ok_or("Missing or invalid session ID")?
            .to_string();
        let attrs = &data["attributes"];
        let checkout_url = attrs["checkout_url"]
            .as_str()
            .filter(|url| valid_checkout_url(url))
            .ok_or("Missing or invalid checkout URL")?
            .to_string();
        let reference_number = attrs["reference_number"]
            .as_str()
            .ok_or("Missing checkout reference")?
            .to_string();
        if reference_number != req.reference_number {
            return Err("PayMongo returned a different checkout reference".into());
        }
        let status = attrs["status"]
            .as_str()
            .ok_or("Missing checkout status")?
            .to_string();
        if status != "active" {
            return Err("PayMongo checkout session is not active".into());
        }
        let items = attrs["line_items"]
            .as_array()
            .filter(|items| !items.is_empty())
            .ok_or("PayMongo returned no checkout line items")?;
        let response_currency = items[0]["currency"]
            .as_str()
            .ok_or("PayMongo returned a line item without currency")?;
        let amount_minor = items
            .iter()
            .try_fold(0_u64, |sum, item| {
                let item_currency = item["currency"].as_str()?;
                if item_currency != response_currency {
                    return None;
                }
                let item_amount = item["amount"].as_u64()?;
                let quantity = item["quantity"].as_u64()?;
                if item_amount == 0 || quantity == 0 {
                    return None;
                }
                sum.checked_add(item_amount.checked_mul(quantity)?)
            })
            .ok_or("PayMongo returned invalid checkout line items")?;
        let currency = response_currency.to_string();
        if amount_minor != expected_amount
            || !currency.eq_ignore_ascii_case(&req.line_items[0].currency)
        {
            return Err("PayMongo checkout amount or currency did not match the request".into());
        }
        let livemode = attrs["livemode"].as_bool().ok_or("Missing checkout mode")?;

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
        if !valid_provider_id(session_id, "cs_") {
            return Err("Invalid checkout session ID".to_string());
        }
        let url = format!(
            "{}/v2/checkout_sessions/{session_id}/expire",
            self.api_origin
        );
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
        if !valid_provider_id(&req.payment_id, "pay_")
            || req.amount_minor == 0
            || req.currency != "PHP"
            || !(8..=100).contains(&req.operation_id.len())
            || !req
                .operation_id
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        {
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

        let url = format!("{}/v1/refunds", self.api_origin);
        let idempotency_key = format!(
            "wsb-refund-{}",
            Sha256::digest(format!("{}:{}", req.payment_id, req.operation_id).as_bytes())
                .iter()
                .map(|b| format!("{b:02x}"))
                .collect::<String>()
        );
        let response = self
            .client
            .post(&url)
            .basic_auth(&self.secret_key, Some(""))
            .header("Idempotency-Key", idempotency_key)
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
        let id = data["id"]
            .as_str()
            .filter(|id| valid_provider_id(id, "ref_"))
            .ok_or("Missing or invalid refund ID")?
            .to_string();
        let attrs = &data["attributes"];
        let payment_id = attrs["payment_id"]
            .as_str()
            .filter(|value| valid_provider_id(value, "pay_"))
            .ok_or("Missing or invalid refund payment ID")?
            .to_string();
        let amount_minor = attrs["amount"].as_u64().ok_or("Missing refund amount")?;
        let currency = attrs["currency"]
            .as_str()
            .filter(|v| !v.is_empty())
            .ok_or("Missing refund currency")?
            .to_string();
        let livemode = attrs["livemode"].as_bool().ok_or("Missing refund mode")?;
        let status = attrs["status"]
            .as_str()
            .ok_or("Missing refund status")?
            .to_string();
        if id.is_empty()
            || payment_id != req.payment_id
            || amount_minor != req.amount_minor
            || currency != req.currency
            || !matches!(
                status.as_str(),
                "pending" | "processing" | "succeeded" | "failed"
            )
        {
            return Err("PayMongo refund response does not match the request".into());
        }

        Ok(PaymongoRefund {
            id,
            payment_id,
            amount_minor,
            currency,
            livemode,
            status,
        })
    }
}

/// Parse raw PayMongo webhook JSON payload into a structured event.
pub fn parse_event(body: &[u8]) -> Result<PaymongoEvent, String> {
    let root: serde_json::Value =
        serde_json::from_slice(body).map_err(|e| format!("Malformed JSON: {e}"))?;
    let data = &root["data"];
    let event_id = data["id"]
        .as_str()
        .filter(|value| valid_provider_id(value, "evt_"))
        .ok_or("Missing or invalid event ID")?
        .to_string();
    let attrs = &data["attributes"];
    let type_str = attrs["type"].as_str().ok_or("Missing event type")?;
    let livemode = attrs["livemode"].as_bool().ok_or("Missing event mode")?;
    let inner_data = &attrs["data"];
    let inner_attrs = &inner_data["attributes"];

    match type_str {
        "checkout_session.payment.paid" => {
            if data["type"] != "event"
                || inner_data["type"] != "checkout_session"
                || attrs["livemode"].as_bool() != Some(livemode)
                || inner_attrs["livemode"].as_bool().unwrap_or(livemode) != livemode
            {
                return Err("Invalid checkout event type or mode".into());
            }
            let session_id = Some(
                inner_data["id"]
                    .as_str()
                    .filter(|value| valid_provider_id(value, "cs_"))
                    .ok_or("Missing or invalid session ID")?
                    .to_string(),
            );
            let reference_number = Some(
                inner_attrs["reference_number"]
                    .as_str()
                    .filter(|s| !s.is_empty())
                    .ok_or("Missing checkout reference")?
                    .to_string(),
            );
            let payments = inner_attrs["payments"]
                .as_array()
                .ok_or("Missing payments")?;
            let paid: Vec<_> = payments
                .iter()
                .filter(|p| p["attributes"]["status"] == "paid")
                .collect();
            if paid.len() != 1
                || paid[0]["type"] != "payment"
                || paid[0]["attributes"]["livemode"].as_bool() != Some(livemode)
            {
                return Err("Invalid paid payment count, type or mode".into());
            }
            let p = paid[0];
            let payment = Some(PaymongoPaidPayment {
                payment_id: p["id"]
                    .as_str()
                    .filter(|value| valid_provider_id(value, "pay_"))
                    .ok_or("Missing or invalid payment ID")?
                    .to_string(),
                amount_minor: p["attributes"]["amount"]
                    .as_u64()
                    .filter(|v| *v > 0)
                    .ok_or("Invalid payment amount")?,
                currency: p["attributes"]["currency"]
                    .as_str()
                    .filter(|s| !s.is_empty())
                    .ok_or("Missing payment currency")?
                    .to_string(),
                status: "paid".to_string(),
                livemode,
            });
            Ok(PaymongoEvent {
                event_id,
                event_type: PaymongoEventType::CheckoutSessionPaid,
                livemode,
                session_id,
                reference_number,
                payment,
                refund_id: None,
                refunds: Vec::new(),
            })
        }
        "payment.paid" => {
            if data["type"] != "event"
                || inner_data["type"] != "payment"
                || inner_attrs["livemode"].as_bool() != Some(livemode)
                || inner_attrs["status"] != "paid"
            {
                return Err("Invalid payment event type, mode or status".into());
            }
            let payment_id = inner_data["id"]
                .as_str()
                .filter(|value| valid_provider_id(value, "pay_"))
                .ok_or("Missing or invalid payment ID")?
                .to_string();
            let amount_minor = inner_attrs["amount"]
                .as_u64()
                .filter(|amount| *amount > 0)
                .ok_or("Missing or invalid payment amount")?;
            let currency = inner_attrs["currency"]
                .as_str()
                .filter(|value| !value.is_empty() && value.len() <= 3)
                .ok_or("Missing or invalid payment currency")?
                .to_string();
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
                refunds: Vec::new(),
            })
        }
        "payment.refunded" | "payment.refund.updated" => {
            if data["type"] != "event" {
                return Err("Invalid refund event envelope".into());
            }
            let (payment, refunds) = if inner_data["type"] == "payment" {
                let payment_id = inner_data["id"]
                    .as_str()
                    .filter(|value| valid_provider_id(value, "pay_"))
                    .ok_or("Missing or invalid payment ID")?
                    .to_string();
                let amount_minor = inner_attrs["amount"]
                    .as_u64()
                    .ok_or("Missing payment amount")?;
                let currency = inner_attrs["currency"]
                    .as_str()
                    .filter(|v| !v.is_empty())
                    .ok_or("Missing payment currency")?
                    .to_string();
                let status = inner_attrs["status"]
                    .as_str()
                    .ok_or("Missing payment status")?
                    .to_string();
                let values = inner_attrs["refunds"]
                    .as_array()
                    .ok_or("Missing payment refunds")?;
                let mut refunds = Vec::with_capacity(values.len());
                for value in values {
                    if value["type"] != "refund" {
                        return Err("Invalid refund resource".into());
                    }
                    let attrs = &value["attributes"];
                    let refund = PaymongoRefund {
                        id: value["id"]
                            .as_str()
                            .filter(|value| valid_provider_id(value, "ref_"))
                            .ok_or("Missing or invalid refund ID")?
                            .to_string(),
                        payment_id: attrs["payment_id"]
                            .as_str()
                            .ok_or("Missing refund payment ID")?
                            .to_string(),
                        amount_minor: attrs["amount"]
                            .as_u64()
                            .filter(|v| *v > 0)
                            .ok_or("Invalid refund amount")?,
                        currency: attrs["currency"]
                            .as_str()
                            .ok_or("Missing refund currency")?
                            .to_string(),
                        livemode: attrs["livemode"].as_bool().ok_or("Missing refund mode")?,
                        status: attrs["status"]
                            .as_str()
                            .ok_or("Missing refund status")?
                            .to_string(),
                    };
                    if refund.payment_id != payment_id
                        || refund.currency != currency
                        || refund.livemode != livemode
                        || !matches!(
                            refund.status.as_str(),
                            "pending" | "processing" | "succeeded" | "failed"
                        )
                    {
                        return Err("Refund resource does not match its payment".into());
                    }
                    refunds.push(refund);
                }
                (
                    PaymongoPaidPayment {
                        payment_id,
                        amount_minor,
                        currency,
                        status,
                        livemode,
                    },
                    refunds,
                )
            } else if inner_data["type"] == "refund" {
                let refund = PaymongoRefund {
                    id: inner_data["id"]
                        .as_str()
                        .filter(|value| valid_provider_id(value, "ref_"))
                        .ok_or("Missing or invalid refund ID")?
                        .to_string(),
                    payment_id: inner_attrs["payment_id"]
                        .as_str()
                        .filter(|value| valid_provider_id(value, "pay_"))
                        .ok_or("Missing or invalid refund payment ID")?
                        .to_string(),
                    amount_minor: inner_attrs["amount"]
                        .as_u64()
                        .filter(|v| *v > 0)
                        .ok_or("Invalid refund amount")?,
                    currency: inner_attrs["currency"]
                        .as_str()
                        .ok_or("Missing refund currency")?
                        .to_string(),
                    livemode: inner_attrs["livemode"]
                        .as_bool()
                        .ok_or("Missing refund mode")?,
                    status: inner_attrs["status"]
                        .as_str()
                        .ok_or("Missing refund status")?
                        .to_string(),
                };
                if refund.livemode != livemode
                    || !matches!(
                        refund.status.as_str(),
                        "pending" | "processing" | "succeeded" | "failed"
                    )
                {
                    return Err("Refund resource mode or status is invalid".into());
                }
                let payment = PaymongoPaidPayment {
                    payment_id: refund.payment_id.clone(),
                    amount_minor: refund.amount_minor,
                    currency: refund.currency.clone(),
                    status: refund.status.clone(),
                    livemode,
                };
                (payment, vec![refund])
            } else {
                return Err("Unexpected resource in refund event".into());
            };
            let refund_id = refunds.first().map(|refund| refund.id.clone());
            Ok(PaymongoEvent {
                event_id,
                event_type: PaymongoEventType::PaymentRefunded,
                livemode,
                session_id: None,
                reference_number: None,
                payment: Some(payment),
                refund_id,
                refunds,
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
            refunds: Vec::new(),
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
                            "livemode": false,
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
                            "status": "paid",
                            "refunds": [
                                {
                                    "id": "ref_abc999",
                                    "type": "refund",
                                    "attributes": {
                                        "amount": 15000,
                                        "currency": "PHP",
                                        "status": "succeeded",
                                        "payment_id": "pay_xyz001",
                                        "livemode": true
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
        assert_eq!(event.event_id, "evt_refund123");
        assert_eq!(event.event_type, PaymongoEventType::PaymentRefunded);
        assert!(event.livemode);
        let payment = event.payment.unwrap();
        assert_eq!(payment.payment_id, "pay_xyz001");
        assert_eq!(payment.amount_minor, 15000);
        assert_eq!(event.refund_id.as_deref(), Some("ref_abc999"));
        assert_eq!(event.refunds[0].amount_minor, 15000);
        assert_eq!(event.refunds[0].payment_id, "pay_xyz001");
    }

    #[test]
    fn client_fails_closed_when_unconfigured() {
        assert!(
            PaymongoClient::from_env().is_none() || std::env::var("PAYMONGO_SECRET_KEY").is_ok()
        );
    }
}
