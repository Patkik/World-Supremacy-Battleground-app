use jsonwebtoken::{decode, decode_header, jwk::JwkSet, Algorithm, DecodingKey, Validation};
use serde::Deserialize;
use std::{
    sync::Arc,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct Verifier {
    project: String,
    client: reqwest::Client,
    keys: Arc<Mutex<Option<(Instant, JwkSet)>>>,
}

#[derive(Debug, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub iat: u64,
    pub auth_time: u64,
    #[serde(rename = "chapterId")]
    pub chapter_id: Option<String>,
    pub role: Option<String>,
}

impl Verifier {
    pub fn new(project: String) -> Result<Self, reqwest::Error> {
        Ok(Self {
            project,
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(5))
                .build()?,
            keys: Arc::new(Mutex::new(None)),
        })
    }

    pub async fn verify(&self, token: &str) -> Result<Claims, ()> {
        let header = decode_header(token).map_err(|_| ())?;
        if header.alg != Algorithm::RS256 {
            return Err(());
        }
        let kid = header.kid.ok_or(())?;
        let mut cache = self.keys.lock().await;
        if cache
            .as_ref()
            .map(|(time, _)| time.elapsed() >= Duration::from_secs(300))
            .unwrap_or(true)
        {
            let keys = self.client.get("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
                .send().await.map_err(|_| ())?.error_for_status().map_err(|_| ())?
                .json::<JwkSet>().await.map_err(|_| ())?;
            *cache = Some((Instant::now(), keys));
        }
        let jwk = cache.as_ref().ok_or(())?.1.find(&kid).ok_or(())?;
        let key = DecodingKey::from_jwk(jwk).map_err(|_| ())?;
        drop(cache);
        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_audience(&[&self.project]);
        validation.set_issuer(&[format!("https://securetoken.google.com/{}", self.project)]);
        validation.set_required_spec_claims(&["exp", "iat", "aud", "iss", "sub"]);
        validation.leeway = 0;
        let claims = decode::<Claims>(token, &key, &validation)
            .map_err(|_| ())?
            .claims;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| ())?
            .as_secs();
        if claims.sub.is_empty()
            || claims.sub.len() > 128
            || claims.iat > now
            || claims.auth_time > now
        {
            return Err(());
        }
        Ok(claims)
    }
}

pub fn chapter_access(claims: &Claims, chapter: &str) -> bool {
    claims.chapter_id.as_deref() == Some(chapter)
        && matches!(
            claims.role.as_deref(),
            Some(
                "chapter_director" | "head_judge" | "judge" | "marshal" | "crew_manager" | "dancer"
            )
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_cross_chapter_and_unknown_roles() {
        let mut c = Claims {
            sub: "judge-1".into(),
            iat: 0,
            auth_time: 0,
            chapter_id: Some("ph".into()),
            role: Some("judge".into()),
        };
        assert!(chapter_access(&c, "ph"));
        assert!(!chapter_access(&c, "au"));
        c.role = Some("invented_admin".into());
        assert!(!chapter_access(&c, "ph"));
    }
    #[tokio::test]
    async fn rejects_malformed_token_without_network() {
        assert!(Verifier::new("demo-wsb".into())
            .unwrap()
            .verify("invalid")
            .await
            .is_err());
    }
}
