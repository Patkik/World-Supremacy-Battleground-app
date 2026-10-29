mod auth;
use axum::{
    extract::{DefaultBodyLimit, Path, State},
    http::{header, HeaderMap, HeaderValue, Method, StatusCode},
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

fn router(verifier: auth::Verifier, origin: HeaderValue) -> Router {
    Router::new()
        .route(
            "/healthz",
            get(|| async { Json(json!({"status":"ok","service":"wsb-api"})) }),
        )
        .route("/v1/chapters/{chapter_id}/session", get(session))
        .layer(DefaultBodyLimit::max(64 * 1024))
        .layer(
            CorsLayer::new()
                .allow_origin(origin)
                .allow_methods([Method::GET])
                .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(verifier)
}

async fn session(
    State(verifier): State<auth::Verifier>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
) -> Result<([(header::HeaderName, &'static str); 1], Json<Value>), StatusCode> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;
    let claims = verifier
        .verify(token)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    if !auth::chapter_access(&claims, &chapter) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok((
        [(header::CACHE_CONTROL, "no-store")],
        Json(json!({"uid":claims.sub,"chapter_id":chapter,"role":claims.role})),
    ))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "wsb_api=info,tower_http=info".into()),
        )
        .init();
    let project = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into());
    let origin = std::env::var("WEB_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".into())
        .parse()?;
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8088".into())
        .parse()?;
    // Explicit opt-in validates ADC connectivity; no writes occur at startup.
    #[cfg(feature = "firestore")]
    let _db = firestore::FirestoreDb::new(&project).await?;
    let app = router(auth::Verifier::new(project)?, origin);
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::UNSPECIFIED, port)).await?;
    tracing::info!(port, "WSB API listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await?;
    Ok(())
}

async fn shutdown() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("install interrupt handler");
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install terminate handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    tracing::info!("Shutdown requested; draining connections");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tower::ServiceExt;
    #[tokio::test]
    async fn health_is_public_but_session_requires_auth() {
        let app = router(
            auth::Verifier::new("demo-wsb".into()).unwrap(),
            "http://localhost:3000".parse().unwrap(),
        );
        for (path, status) in [
            ("/healthz", StatusCode::OK),
            ("/v1/chapters/ph/session", StatusCode::UNAUTHORIZED),
        ] {
            let response = app
                .clone()
                .oneshot(
                    axum::http::Request::builder()
                        .uri(path)
                        .body(axum::body::Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), status);
        }
    }
}
