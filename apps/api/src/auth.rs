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
    #[cfg(feature = "local-testing")]
    local_keys: Option<Arc<JwkSet>>,
}

#[derive(Debug, Clone, Deserialize)]
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
            #[cfg(feature = "local-testing")]
            local_keys: None,
        })
    }

    #[cfg(feature = "local-testing")]
    pub fn local_testing(
        project: String,
        keys: JwkSet,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        if project != "demo-wsb" || keys.keys.is_empty() {
            return Err("Local signed identity is restricted to demo-wsb".into());
        }
        let mut verifier = Self::new(project)?;
        verifier.local_keys = Some(Arc::new(keys));
        Ok(verifier)
    }

    async fn decoding_key(&self, kid: &str) -> Result<DecodingKey, ()> {
        #[cfg(feature = "local-testing")]
        if let Some(keys) = &self.local_keys {
            return DecodingKey::from_jwk(keys.find(kid).ok_or(())?).map_err(|_| ());
        }
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
        let jwk = cache.as_ref().ok_or(())?.1.find(kid).ok_or(())?;
        let key = DecodingKey::from_jwk(jwk).map_err(|_| ())?;
        Ok(key)
    }

    #[allow(clippy::result_unit_err)]
    pub async fn verify(&self, token: &str) -> Result<Claims, ()> {
        let header = decode_header(token).map_err(|_| ())?;
        if header.alg != Algorithm::RS256 {
            return Err(());
        }
        let kid = header.kid.ok_or(())?;
        let key = self.decoding_key(&kid).await?;
        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_audience(&[&self.project]);
        let issuer = format!("https://securetoken.google.com/{}", self.project);
        #[cfg(feature = "local-testing")]
        let issuer = if self.local_keys.is_some() {
            "urn:wsb:local-testing".to_owned()
        } else {
            issuer
        };
        validation.set_issuer(&[issuer]);
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
                "chapter_director"
                    | "registrar"
                    | "finance"
                    | "verifier"
                    | "support"
                    | "head_judge"
                    | "judge"
                    | "marshal"
                    | "crew_manager"
                    | "dancer"
            )
        )
}

#[cfg(test)]
impl Verifier {
    pub(crate) fn mock(project: String, keys: JwkSet) -> Self {
        Self {
            project,
            client: reqwest::Client::new(),
            keys: Arc::new(Mutex::new(Some((Instant::now(), keys)))),
            #[cfg(feature = "local-testing")]
            local_keys: None,
        }
    }
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

    #[cfg(feature = "local-testing")]
    #[tokio::test]
    #[ignore = "requires generated Docker local-test keys and WSB_RUN_LOCAL_IDENTITY_TESTS=demo-wsb"]
    async fn local_signed_identity_cannot_change_the_production_verifier() {
        assert_eq!(
            std::env::var("WSB_RUN_LOCAL_IDENTITY_TESTS").as_deref(),
            Ok("demo-wsb")
        );
        use jsonwebtoken::{encode, EncodingKey, Header};
        let directory = std::path::PathBuf::from(std::env::var("WSB_LOCAL_KEY_DIR").unwrap());
        let keys: JwkSet =
            serde_json::from_slice(&std::fs::read(directory.join("jwks.json")).unwrap()).unwrap();
        let signing =
            EncodingKey::from_rsa_der(&std::fs::read(directory.join("signing-key.der")).unwrap());
        let mut header = Header::new(Algorithm::RS256);
        header.kid = keys.keys[0].common.key_id.clone();
        assert!(Verifier::local_testing("real-project".into(), keys.clone()).is_err());
        let local = Verifier::local_testing("demo-wsb".into(), keys.clone()).unwrap();
        let production = Verifier::new("demo-wsb".into()).unwrap();
        // Even if a key were shared, the regular verifier must enforce Firebase issuer.
        *production.keys.lock().await = Some((Instant::now(), keys));
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let mut claims = serde_json::json!({"iss":"urn:wsb:local-testing","aud":"demo-wsb","sub":"synthetic-judge","iat":now,"auth_time":now,"exp":now+3600,"chapterId":"ph","role":"judge"});
        let token = encode(&header, &claims, &signing).unwrap();
        assert!(local.verify(&token).await.is_ok());
        assert!(production.verify(&token).await.is_err());
        claims["iss"] = serde_json::json!("https://securetoken.google.com/demo-wsb");
        let token = encode(&header, &claims, &signing).unwrap();
        assert!(local.verify(&token).await.is_err());
        assert!(production.verify(&token).await.is_ok());
        claims["iss"] = serde_json::json!("urn:wsb:local-testing");
        claims["exp"] = serde_json::json!(now - 60);
        assert!(local
            .verify(&encode(&header, &claims, &signing).unwrap())
            .await
            .is_err());
        claims["exp"] = serde_json::json!(now + 3600);
        claims["iat"] = serde_json::json!(now + 120);
        assert!(local
            .verify(&encode(&header, &claims, &signing).unwrap())
            .await
            .is_err());
        claims["iat"] = serde_json::json!(now);
        claims["aud"] = serde_json::json!("other-project");
        assert!(local
            .verify(&encode(&header, &claims, &signing).unwrap())
            .await
            .is_err());
    }
}
