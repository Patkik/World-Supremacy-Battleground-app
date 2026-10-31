FROM rust:1-bookworm@sha256:9181b56c2a21ab1d5e73cffe04fc762426d30aa7fac3c91141dd033f49a7fc8b AS build
WORKDIR /source
COPY Cargo.toml Cargo.lock ./
COPY rust-toolchain.toml ./
COPY apps/api ./apps/api
RUN cargo build --locked --release -p wsb-api --features firestore
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=build /source/target/release/wsb-api /usr/local/bin/wsb-api
USER 65532:65532
ENV PORT=8080
EXPOSE 8080
CMD ["wsb-api"]
