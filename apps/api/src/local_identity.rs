//! Signed local-test identity. Compiled out of production builds. Passwords are
//! checked by the Auth emulator; browser-provided unsigned tokens are never used.
use crate::{auth::Verifier, registration::AppState, store::now_secs};
use axum::{extract::State, http::StatusCode, Json};
use jsonwebtoken::{encode, jwk::JwkSet, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use std::{path::Path, time::Duration};

pub struct LocalIdentity {
    client: reqwest::Client,
    host: String,
    signing_key: EncodingKey,
    kid: String,
}
impl LocalIdentity {
    pub fn from_env(project: &str) -> Result<(Verifier, Self), Box<dyn std::error::Error>> {
        if project != "demo-wsb" {
            return Err("Local identity requires demo-wsb".into());
        }
        let host = std::env::var("FIREBASE_AUTH_EMULATOR_HOST")?;
        let (name, port) = host
            .rsplit_once(':')
            .ok_or("Invalid Auth emulator address")?;
        if !matches!(name, "firebase" | "localhost" | "127.0.0.1") || port.parse::<u16>().is_err() {
            return Err("Local identity requires a local Auth emulator".into());
        }
        let directory = std::env::var("WSB_LOCAL_KEY_DIR")?;
        let keys: JwkSet =
            serde_json::from_slice(&std::fs::read(Path::new(&directory).join("jwks.json"))?)?;
        let kid = keys
            .keys
            .first()
            .and_then(|key| key.common.key_id.clone())
            .ok_or("Local identity key ID is missing")?;
        let signing_key = EncodingKey::from_rsa_der(&std::fs::read(
            Path::new(&directory).join("signing-key.der"),
        )?);
        let verifier = Verifier::local_testing(project.into(), keys)?;
        Ok((
            verifier,
            Self {
                client: reqwest::Client::builder()
                    .timeout(Duration::from_secs(8))
                    .build()?,
                host,
                signing_key,
                kid,
            },
        ))
    }
}
#[derive(Deserialize)]
pub struct SignIn {
    email: String,
    password: String,
    chapter_id: String,
}
#[derive(Deserialize)]
struct AuthResponse {
    #[serde(rename = "localId")]
    uid: String,
}
#[derive(Serialize)]
struct LocalClaims<'a> {
    iss: &'static str,
    aud: &'static str,
    sub: &'a str,
    iat: u64,
    exp: u64,
    auth_time: u64,
    #[serde(rename = "chapterId")]
    chapter_id: &'a str,
    role: &'a str,
}
#[derive(Serialize)]
pub struct SignedSession {
    token: String,
    uid: String,
    expires_at: u64,
}

pub async fn sign_in(
    State(state): State<AppState>,
    Json(payload): Json<SignIn>,
) -> Result<Json<SignedSession>, StatusCode> {
    let identity = state.local_identity.as_ref().ok_or(StatusCode::NOT_FOUND)?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    if payload.email.is_empty()
        || payload.email.len() > 254
        || payload.password.is_empty()
        || payload.password.len() > 4096
        || payload.chapter_id.is_empty()
        || payload.chapter_id.len() > 200
    {
        return Err(StatusCode::BAD_REQUEST);
    }
    let response=identity.client.post(format!("http://{}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",identity.host))
        .json(&serde_json::json!({"email":payload.email,"password":payload.password,"returnSecureToken":true})).send().await.map_err(|_|StatusCode::SERVICE_UNAVAILABLE)?;
    if !response.status().is_success() {
        return Err(StatusCode::UNAUTHORIZED);
    }
    let auth: AuthResponse = response
        .json()
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    if auth.uid.is_empty() || auth.uid.len() > 128 {
        return Err(StatusCode::UNAUTHORIZED);
    }
    let member = repository
        .local_identity_member(&auth.uid, &payload.chapter_id)
        .await
        .map_err(StatusCode::from)?;
    let now = now_secs();
    let expires_at = now + 3600;
    if now < member.valid_after {
        return Err(StatusCode::FORBIDDEN);
    }
    let claims = LocalClaims {
        iss: "urn:wsb:local-testing",
        aud: "demo-wsb",
        sub: &auth.uid,
        iat: now,
        exp: expires_at,
        auth_time: now,
        chapter_id: &member.chapter_id,
        role: &member.role,
    };
    let mut header = Header::new(Algorithm::RS256);
    header.kid = Some(identity.kid.clone());
    let token = encode(&header, &claims, &identity.signing_key)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(SignedSession {
        token,
        uid: auth.uid,
        expires_at,
    }))
}
