# Tutorial: run a synthetic WSB rehearsal

Start the complete local system with Docker, then follow a crew entry into its registration and payment workspace. All rehearsal data belongs to `demo-wsb`; no production credentials or real participant records are needed.

## Prerequisites

- Windows PowerShell and a running Docker Desktop with Linux containers.
- This workspace and available localhost ports in the table below.
- Internet access for the initial image and dependency download.

Containers supply Node **24**, Rust **1.99.1**, Next.js **16.4.3**, React **19.3.1** and Firebase tooling. The repository lockfiles and pinned image digests are the reproducible version sources; host Node, Rust and Java are unnecessary for the Docker path.

## 1. Start the system

Open PowerShell in the repository root:

```powershell
Set-Location 'C:\Users\patri\Desktop\Holy folder\World Supremacy Battlegrounds'
./tools/local.ps1 setup
./tools/local.ps1 status
```

`setup` builds the tooling images and starts the services. The first Rust compilation can take several minutes; use `./tools/local.ps1 logs` to follow startup. Subsequent starts reuse images and dependency/build volumes:

```powershell
./tools/local.ps1 up
```

| Service | Default local address |
| --- | --- |
| Website and sign-in | http://localhost:3100/sign-in |
| Rust API liveness | http://localhost:8189/healthz |
| Firebase emulator UI | http://localhost:4408 |
| Auth / Firestore / Storage | localhost:9099 / 8188 / 9199 |
| PayMongo emulator | http://localhost:8191 |

The Docker website uses **port 3100** on the host. Port 3000 is inside the web container; the separate non-Docker development guide uses different ports.

## 2. Sign in with synthetic fixtures

Use `manager@ph.wsb.test` and the `WSB_TEST_PASSWORD` saved in your ignored local `.env.docker`. Open that file privately in your editor; do not paste its password or signing secrets into documentation, screenshots or presentations. Setup generates local settings and preserves them on later starts.

Open [crews](http://localhost:3100/app/crews), then [local registration](http://localhost:3100/app/register/local-rehearsal). Create a crew, invite a synthetic dancer, accept the invitation using a dancer fixture, and explicitly select performers for the event entry. A manager is not automatically a dancer.

The entry shows incomplete readiness as a correction state. It must not pretend that a guardian signed, music passed inspection or a payment settled merely because the form was submitted. The seeded approved entry is a deliberately synthetic fixture for subsequent judging and venue exercises.

## 3. Inspect a payment without moving money

Open the fixture [checkout](http://localhost:3100/app/entries/local-entry-draft/checkout?event=local-rehearsal). Read the server quote and use the clearly labeled local PayMongo simulation where available. A checkout reservation remains pending until a verified synthetic callback records settlement; a return URL alone does not prove payment.

The [finance desk](http://localhost:3100/admin/ph/finance/transactions) uses `finance@ph.wsb.test`. Sign out through `/workspaces` before switching roles. Do not use real bank references, customer identifiers or provider keys during rehearsal.

## 4. Confirm health and understand readiness

```powershell
(Invoke-WebRequest http://localhost:3100 -UseBasicParsing).StatusCode
(Invoke-WebRequest http://localhost:8189/healthz -UseBasicParsing).Content
./tools/local.ps1 status
```

Expect website HTTP 200, API JSON containing `status: ok`, and healthy running services. A seed container that exited successfully is normal. `/readyz` returning 503 is an intentional release gate, not a reason to bypass authorization.

## Recovery and faster iteration

Source files are mounted from the workspace. Web edits normally refresh automatically; run `./tools/local.ps1 restart-web` if the watcher misses a change. After Rust edits run `./tools/local.ps1 restart-api`; cached Cargo output makes compilation incremental.

Rebuild with `./tools/local.ps1 build` when changing dependency manifests, lockfiles, Dockerfiles or toolchain/image contents, then run `up`. Ordinary source changes do not need image rebuilds. For port conflicts, change only the relevant port in your private `.env.docker` and run `up` again.

```powershell
./tools/local.ps1 test
# Graceful shutdown preserves named volumes:
./tools/local.ps1 down
./tools/local.ps1 up
```

Graceful emulator export/import supports local recovery. It does not establish a production backup strategy or protection from a forced host shutdown. See the [detailed local guide](../local-docker.md) for targeted recovery tests.
