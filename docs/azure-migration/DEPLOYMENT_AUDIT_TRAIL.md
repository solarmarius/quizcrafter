# Deployment Audit Trail — QuizCrafter Production

**Deployment Date:** 2026-02-19
**Deployer:** Marius Solaas
**Target Environment:** Azure App Service (Production)
**Resource Group:** `p-qzcrft`
**Branch:** `azure-migration`

---

## Pre-Deployment (Completed by Azure Admin)

| Step                           | Status | Timestamp  | Notes                                                    |
| ------------------------------ | ------ | ---------- | -------------------------------------------------------- |
| VNet + Subnets created         | Done   | 2026-02-18 | `p-qzcrft-network-vnet` in `p-qzcrft-network` RG         |
| Private DNS Zone created       | Done   | 2026-02-18 | `privatelink.postgres.database.azure.com` linked to VNet |
| BackendSubnet delegation       | Done   | 2026-02-18 | Delegated to `Microsoft.Web/serverFarms`                 |
| Backend VNet integration       | Done   | 2026-02-18 | Integrated with `BackendSubnet`                          |
| Key Vault RBAC role assigned   | Done   | 2026-02-18 | `Key Vault Secrets User` to backend managed identity     |
| AcrPull role assigned          | Done   | 2026-02-18 | Backend managed identity can pull from `pqzcrftacr`      |
| `quizcrafter` database created | Done   | 2026-02-19 | On `p-qzcrft-psql`                                       |

---

## Step 1: Populate Key Vault Secrets

**Status:** Completed
**Timestamp:** 2026-02-19 ~14:00 UTC

### Commands Run

```bash
# Reset PostgreSQL admin password and store in Key Vault
NEW_PW=$(openssl rand -base64 24) && \
  az postgres flexible-server update --name p-qzcrft-psql --resource-group p-qzcrft --admin-password "$NEW_PW" && \
  az keyvault secret set --vault-name p-qzcrft-kv --name "POSTGRES-PASSWORD" --value "$NEW_PW"
```

```bash
KV="p-qzcrft-kv"

az keyvault secret set --vault-name $KV --name "SECRET-KEY" --value "$(openssl rand -hex 32)"
az keyvault secret set --vault-name $KV --name "CANVAS-CLIENT-ID" --value "<redacted>"
az keyvault secret set --vault-name $KV --name "CANVAS-CLIENT-SECRET" --value "<redacted>"
az keyvault secret set --vault-name $KV --name "CANVAS-BASE-URL" --value "https://uit.instructure.com"
az keyvault secret set --vault-name $KV --name "CANVAS-REDIRECT-URI" --value "https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/auth/callback/canvas"
az keyvault secret set --vault-name $KV --name "AZURE-OPENAI-API-KEY" --value "<redacted>"
az keyvault secret set --vault-name $KV --name "AZURE-OPENAI-ENDPOINT" --value "<redacted>"
az keyvault secret set --vault-name $KV --name "AZURE-OPENAI-API-VERSION" --value "2024-02-15-preview"
```

### Verification

```bash
az keyvault secret list --vault-name p-qzcrft-kv --query "[].name" -o tsv
```

**Result:** All 9 required secrets present:

```
AZURE-OPENAI-API-KEY
AZURE-OPENAI-API-VERSION
AZURE-OPENAI-ENDPOINT
CANVAS-BASE-URL
CANVAS-CLIENT-ID
CANVAS-CLIENT-SECRET
CANVAS-REDIRECT-URI
POSTGRES-PASSWORD
SECRET-KEY
```

Plus 2 pre-existing admin-created secrets (`postgres-admin-password`, `postgres-admin-username`).

---

## Step 2: Build and Push Backend Docker Image

**Status:** Completed
**Timestamp:** 2026-02-19 ~14:15 UTC

### Commands to Run

```bash
az acr login --name pqzcrftacr

COMMIT_SHA=$(git rev-parse --short HEAD)
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"

docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-backend:latest \
  -t ${ACR_LOGIN}/quizcrafter-backend:${COMMIT_SHA} \
  ./backend

docker push ${ACR_LOGIN}/quizcrafter-backend --all-tags
```

### Verification

```bash
az acr repository show-tags --name pqzcrftacr --repository quizcrafter-backend -o table
```

**Result:** Tags confirmed in ACR: `latest`, `16533cb`. Image pushed successfully.

---

## Step 3: Configure Backend App Service

**Status:** Completed
**Timestamp:** 2026-02-19

### Phase 5.1 — Set Container Image: Completed

**Verification:**

- `linuxFxVersion`: `DOCKER|pqzcrftacr-afb8abgzafb6fxf5.azurecr.io/quizcrafter-backend:latest`

### Phase 5.2 — ACR Pull via Managed Identity: Completed

**Verification:**

- `acrUseManagedIdentityCreds`: `true`
- `DOCKER_REGISTRY_SERVER_URL`: `https://pqzcrftacr-afb8abgzafb6fxf5.azurecr.io`
- `WEBSITES_ENABLE_APP_SERVICE_STORAGE`: `false`

### Phase 5.3 — Application Settings: Completed

**Verification:** All 23 settings confirmed — 14 plain values + 9 Key Vault references with correct `@Microsoft.KeyVault(VaultName=p-qzcrft-kv;SecretName=...)` syntax.

### Phase 5.4 — Security + Health Check: Completed

**Verification:**

```json
{
  "alwaysOn": true,
  "ftpsState": "Disabled",
  "healthCheckPath": "/utils/health-check/",
  "http20Enabled": true,
  "linuxFxVersion": "DOCKER|pqzcrftacr-afb8abgzafb6fxf5.azurecr.io/quizcrafter-backend:latest"
}
```

### Commands to Run

```bash
# 3a. Set container image
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"
az webapp config set --name p-qzcrft-backend --resource-group p-qzcrft \
  --linux-fx-version "DOCKER|${ACR_LOGIN}/quizcrafter-backend:latest"

# 3b. Enable managed identity ACR pull
az webapp config appsettings set --name p-qzcrft-backend --resource-group p-qzcrft \
  --settings \
    DOCKER_REGISTRY_SERVER_URL="https://pqzcrftacr-afb8abgzafb6fxf5.azurecr.io" \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE="false"

az resource update \
  --ids /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-backend/config/web \
  --set properties.acrUseManagedIdentityCreds=true

# 3c. Set all application settings
FRONTEND_URL="https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net"
KV="p-qzcrft-kv"

az webapp config appsettings set --name p-qzcrft-backend --resource-group p-qzcrft \
  --settings \
    WEBSITES_PORT="8000" \
    POSTGRES_SERVER="p-qzcrft-psql.postgres.database.azure.com" \
    POSTGRES_PORT="5432" \
    POSTGRES_DB="quizcrafter" \
    POSTGRES_USER="sqladmin" \
    ENVIRONMENT="production" \
    PROJECT_NAME="QuizCrafter" \
    FRONTEND_HOST="${FRONTEND_URL}" \
    SECRET_KEY="@Microsoft.KeyVault(VaultName=${KV};SecretName=SECRET-KEY)" \
    POSTGRES_PASSWORD="@Microsoft.KeyVault(VaultName=${KV};SecretName=POSTGRES-PASSWORD)" \
    CANVAS_CLIENT_ID="@Microsoft.KeyVault(VaultName=${KV};SecretName=CANVAS-CLIENT-ID)" \
    CANVAS_CLIENT_SECRET="@Microsoft.KeyVault(VaultName=${KV};SecretName=CANVAS-CLIENT-SECRET)" \
    CANVAS_BASE_URL="@Microsoft.KeyVault(VaultName=${KV};SecretName=CANVAS-BASE-URL)" \
    CANVAS_REDIRECT_URI="@Microsoft.KeyVault(VaultName=${KV};SecretName=CANVAS-REDIRECT-URI)" \
    AZURE_OPENAI_API_KEY="@Microsoft.KeyVault(VaultName=${KV};SecretName=AZURE-OPENAI-API-KEY)" \
    AZURE_OPENAI_ENDPOINT="@Microsoft.KeyVault(VaultName=${KV};SecretName=AZURE-OPENAI-ENDPOINT)" \
    AZURE_OPENAI_API_VERSION="@Microsoft.KeyVault(VaultName=${KV};SecretName=AZURE-OPENAI-API-VERSION)" \
    WEBSITE_VNET_ROUTE_ALL="1" \
    POSTGRES_SSLMODE="require" \
    WEB_CONCURRENCY="4" \
    WEBSITES_CONTAINER_STOP_TIME_LIMIT="300"

# 3d. Security and health check
az webapp config set --name p-qzcrft-backend --resource-group p-qzcrft \
  --always-on true --ftps-state Disabled --http20-enabled true --min-tls-version 1.2

az webapp config set --name p-qzcrft-backend --resource-group p-qzcrft \
  --generic-configurations '{"healthCheckPath": "/utils/health-check/"}'
```

---

## Step 4: Enable Backend Diagnostics

**Status:** Completed
**Timestamp:** 2026-02-19

**Verification:** `p-qzcrft-backend-diagnostics` confirmed in diagnostic settings list.

### Commands to Run

```bash
WS_ID=$(az monitor log-analytics workspace show \
  --workspace-name p-qzcrft-ws --resource-group p-qzcrft --query id -o tsv)

az monitor diagnostic-settings create \
  --name p-qzcrft-backend-diagnostics \
  --resource /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-backend \
  --workspace "$WS_ID" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true},{"category":"AppServiceAppLogs","enabled":true},{"category":"AppServicePlatformLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

---

## Step 5: Start Backend and Verify

**Status:** Completed
**Timestamp:** 2026-02-19

### Commands Run

```bash
az webapp restart --name p-qzcrft-backend --resource-group p-qzcrft

curl -s https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/utils/health-check/
curl -s https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/utils/health-check/ready
```

**Result:**

- Shallow health check: `true`
- Deep health check: `{"status":"ok","db":"ok"}` — DB connectivity via private endpoint confirmed

---

## Step 6: Run Database Migrations

**Status:** Completed (automated via startup script)
**Timestamp:** 2026-02-19 ~14:24 UTC

**Approach changed:** Instead of manual SSH migration, created `backend/scripts/start.sh` that runs `alembic upgrade head` before starting FastAPI. Dockerfile CMD updated to `bash /app/scripts/start.sh`. Image rebuilt and pushed.

**Migration log output (from container startup):**

- `Running upgrade  -> d4898d030e58, Initial migration`
- `Running upgrade d4898d030e58 -> d751aaf1a0b4, add_module_id_to_questions`
- `Running upgrade d751aaf1a0b4 -> d867ad0af218, add_quiz_sharing_tables`
- `Running upgrade d867ad0af218 -> 08982fd53ba0, add_custom_instructions_to_quiz`
- `Running upgrade 08982fd53ba0 -> 1b928666719e, add_rejection_feedback_fields`
- `Running upgrade 1b928666719e -> da2be2b840af, add_multiple_answer_to_questiontype_enum`

All 6 migrations applied. FastAPI started with 4 workers on port 8000. Health checks passing.

### Commands to Run

```bash
az webapp ssh --name p-qzcrft-backend --resource-group p-qzcrft

# Inside container:
alembic upgrade head
alembic current
python -c "from src.database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"
exit
```

**Expected tables:** `alembic_version`, `user`, `quiz`, `question`, `quizcollaborator`, `quizinvite`

---

## Step 7: Build and Deploy Frontend

**Status:** Completed
**Timestamp:** 2026-02-19

### Commands Run

```bash
cd frontend
npm ci
VITE_API_URL="https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net" npm run build

cd dist && zip -r ../frontend-dist.zip . && cd ..

az webapp config set --name p-qzcrft-frontend --resource-group p-qzcrft \
  --startup-file "pm2 serve /home/site/wwwroot --no-daemon --spa"

az webapp config appsettings set --name p-qzcrft-frontend --resource-group p-qzcrft \
  --settings WEBSITE_NODE_DEFAULT_VERSION="~20" SCM_DO_BUILD_DURING_DEPLOYMENT="false"

az webapp config set --name p-qzcrft-frontend --resource-group p-qzcrft \
  --always-on true --ftps-state Disabled --http20-enabled true --min-tls-version 1.2

az webapp deployment source config-zip \
  --name p-qzcrft-frontend --resource-group p-qzcrft --src frontend-dist.zip
```

### Verification

```bash
curl -s -o /dev/null -w "%{http_code}" https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net
# Result: 200

curl -s -o /dev/null -w "%{http_code}" https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net/login
# Result: 200 (SPA routing confirmed)
```

**Result:** Frontend deployed and serving. Root and `/login` both return HTTP 200, confirming PM2 SPA mode is working correctly.

---

## Step 8: Enable Frontend Diagnostics

**Status:** Completed
**Timestamp:** 2026-02-19

### Commands Run

```bash
WS_ID=$(az monitor log-analytics workspace show \
  --workspace-name p-qzcrft-ws --resource-group p-qzcrft --query id -o tsv)

az monitor diagnostic-settings create \
  --name p-qzcrft-frontend-diagnostics \
  --resource /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-frontend \
  --workspace "$WS_ID" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

**Verification:** `p-qzcrft-frontend-diagnostics` confirmed in diagnostic settings list.

---

## Step 9: Final Verification

**Status:** Completed (automated checks)
**Timestamp:** 2026-02-19

### Automated Checks — All Passing

| Check                                             | Expected                    | Actual                      |
| ------------------------------------------------- | --------------------------- | --------------------------- |
| Frontend root (`/`)                               | 200                         | 200                         |
| Frontend SPA route (`/login`)                     | 200                         | 200                         |
| Backend shallow health (`/utils/health-check/`)   | `true`                      | `true`                      |
| Backend deep health (`/utils/health-check/ready`) | `{"status":"ok","db":"ok"}` | `{"status":"ok","db":"ok"}` |
| Backend API docs (`/docs`)                        | 200                         | 200                         |
| Key Vault references (9 secrets)                  | All present                 | All 9 confirmed             |

### Manual Browser Testing

- [ ] Frontend loads with QuizCrafter UI
- [ ] Canvas OAuth login redirects correctly
- [ ] After login, user is redirected back
- [ ] Course list displays
- [ ] Quiz creation form loads
- [ ] Question generation works (Azure OpenAI)
- [ ] Question review/approval works
- [ ] Export to Canvas works

---

## Issues Encountered

| #   | Issue                                        | Resolution                                                             | Timestamp         |
| --- | -------------------------------------------- | ---------------------------------------------------------------------- | ----------------- |
| 1   | PostgreSQL admin password unknown            | Reset via `az postgres flexible-server update` and stored in Key Vault | 2026-02-19 ~14:00 |
| 2   | SSH not available in custom Docker container | Created `backend/scripts/start.sh` to auto-run migrations on startup   | 2026-02-19 ~14:24 |

---

## Post-Deployment Notes

- All 9 deployment steps completed successfully
- Backend runs as non-root user (`appuser`) in Docker container
- Migrations run automatically on container startup via `start.sh`
- 4 FastAPI workers configured via `WEB_CONCURRENCY=4`
- Both frontend and backend have Log Analytics diagnostics enabled
- Frontend uses PM2 in SPA mode for client-side routing
- All secrets managed via Key Vault references (no plaintext in App Service settings)

---

## Step 10: Backend Performance Optimization (P0v3 Tuning)

**Date:** 2026-02-25
**Deployer:** Marius Solaas

### Context

The App Service Plan is Premium0V3 (P0v3): **1 vCore, 4 GB RAM**. The initial deployment used `fastapi run --workers 4`, which has two problems on this SKU:

1. **No process management**: `fastapi run` provides no worker recycling, graceful restarts, or heartbeat monitoring — all important for a long-lived production container.
2. **Over-provisioned workers**: 4 Python processes × ~250 MB each = ~1 GB RAM for workers alone on a 4 GB machine. Since the app is I/O-bound (async LLM calls, async DB, async Canvas API), 2 workers handle the same concurrency with half the memory.

The fix: switch to **Gunicorn with `uvicorn.workers.UvicornWorker`** — the [officially recommended production setup for FastAPI](https://fastapi.tiangolo.com/deployment/server-workers/). Gunicorn manages processes; each worker runs a full Uvicorn asyncio event loop.

### Code Changes

#### `backend/pyproject.toml`

Added `gunicorn>=23.0.0` to `[project.dependencies]`.

#### `backend/scripts/start.sh`

Replaced:

```bash
exec fastapi run --workers ${WEB_CONCURRENCY:-4} src/main.py
```

With:

```bash
exec gunicorn \
  -w "${WEB_CONCURRENCY:-2}" \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 600 \
  --keep-alive 5 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --worker-tmp-dir /dev/shm \
  src.main:app
```

| Flag                    | Value                   | Rationale                                                                  |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `-w`                    | `${WEB_CONCURRENCY:-2}` | Default 2 workers; saves ~500 MB RAM vs 4 on a 4 GB machine                |
| `-k`                    | `UvicornWorker`         | Each worker runs a full Uvicorn asyncio event loop — full async support    |
| `--timeout`             | `600`                   | Must exceed `LLM_API_TIMEOUT=500 s`; kills and restarts hung workers       |
| `--keep-alive`          | `5`                     | Reuses HTTP connections for 5 s — reduces TCP handshake overhead           |
| `--max-requests`        | `1000`                  | Recycles workers after 1000 requests — prevents Python memory leaks        |
| `--max-requests-jitter` | `100`                   | Staggers recycling so not all workers restart simultaneously               |
| `--worker-tmp-dir`      | `/dev/shm`              | Uses tmpfs (RAM) for Gunicorn heartbeat files — no disk I/O in Docker      |
| `exec`                  | —                       | Replaces the shell process so Gunicorn receives container signals directly |

### Azure App Service Settings — Commands Run

```bash
# 1. Reduce workers from 4 → 2, add MALLOC_ARENA_MAX to reduce glibc memory fragmentation
az webapp config appsettings set \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --settings \
    WEB_CONCURRENCY="2" \
    MALLOC_ARENA_MAX="2"

# 2. Fix use32BitWorkerProcess (was incorrectly true for a 64-bit Linux container)
az resource update \
  --ids /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-backend/config/web \
  --set properties.use32BitWorkerProcess=false
```

**Results:**

| Setting                 | Before  | After   |
| ----------------------- | ------- | ------- |
| `WEB_CONCURRENCY`       | `4`     | `2`     |
| `MALLOC_ARENA_MAX`      | not set | `2`     |
| `use32BitWorkerProcess` | `true`  | `false` |

### Docker Image Rebuild — Completed

**Note:** First push attempt failed with ACR auth expiry (`authentication required`). Re-ran `az acr login --name pqzcrftacr` and pushed successfully.

**Note:** First run failed with `gunicorn: error: unrecognized arguments: --keepalive`. Flag corrected to `--keep-alive` (Gunicorn uses a hyphen). Image rebuilt and pushed again.

```bash
az acr login --name pqzcrftacr

COMMIT_SHA=$(git rev-parse --short HEAD)
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"

docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-backend:latest \
  -t ${ACR_LOGIN}/quizcrafter-backend:${COMMIT_SHA} \
  ./backend

docker push ${ACR_LOGIN}/quizcrafter-backend --all-tags

az webapp restart --name p-qzcrft-backend --resource-group p-qzcrft
```

### Verification — Confirmed 2026-02-25

Logs retrieved via Azure Portal Log Stream (SCM endpoint is IP-restricted, `az webapp log tail` returns 403 from local machine).

**Actual log output:**

```text
2026-02-25T08:28:56Z [INFO] Starting gunicorn 25.1.0
2026-02-25T08:28:56Z [INFO] Listening at: http://0.0.0.0:8000 (1)
2026-02-25T08:28:56Z [INFO] Using worker: uvicorn.workers.UvicornWorker
2026-02-25T08:28:56Z [INFO] Booting worker with pid: 9
2026-02-25T08:28:56Z [INFO] Booting worker with pid: 10
2026-02-25T08:29:01Z [INFO] Application startup complete.   (worker 9)
2026-02-25T08:29:01Z [INFO] Application startup complete.   (worker 10)
```

**Result:** Gunicorn 25.1.0 running with 2 UvicornWorker processes. Both workers started and healthy.

Then confirm health checks still pass:

```bash
curl -s https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/utils/health-check/
# Expected: true

curl -s https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/utils/health-check/ready
# Expected: {"status":"ok","db":"ok"}
```

---

## Step 11: Production Custom Domain & Container Migration (p-qzcrft)

### 8.1 Enable ACR Managed Identity on Frontend App Service

**Context:** Migrating `p-qzcrft-frontend` from zip deploy (blocked by Deny-all access restrictions) to container-based deployment via ACR. Zip deploy uses SCM/Kudu endpoint which is also blocked.

**Command:**

```bash
az webapp update \
  --name p-qzcrft-frontend \
  --resource-group p-qzcrft \
  --set siteConfig.acrUseManagedIdentityCreds=true
```

**Status:** Success

**Prerequisites completed before this step:**

- System-assigned managed identity assigned to `p-qzcrft-frontend` (principal ID: `00249979-a1ff-4f0d-901c-22baecb7ca28`)
- AcrPull role granted to managed identity on `pqzcrftacr` (performed by Azure admin)
- Key Vault `CANVAS-REDIRECT-URI` updated to `https://quizcrafter-api.uit.no/auth/callback/canvas`
- `frontend/.env.production` updated to `VITE_API_URL=https://quizcrafter-api.uit.no`

---

## Step 12: Migrate Frontend to Container-Based Deployment

**Date:** 2026-02-25
**Deployer:** Marius Solaas

### Context

Migrated `p-qzcrft-frontend` from zip-based deployment (Node.js 24-lts + PM2) to Docker container mode, consistent with the backend. The frontend already had a production-ready `Dockerfile` (two-stage: `node:20` Vite build → `nginx:1` static serving).

**Key finding:** `VITE_API_URL=https://quizcrafter-api.uit.no` is baked into the bundle at build time via `frontend/.env.production`. The Dockerfile declares `ARG VITE_API_URL` with **no default value** — this is critical. If the ARG were written as `ARG VITE_API_URL=${VITE_API_URL}`, Docker would default it to an empty string when no `--build-arg` is passed, and Vite would bake that empty string into the bundle (process env vars override `.env` files in Vite). With no default, the ARG is simply unset, and Vite reads `.env.production` as the source of truth.

### Commands Run

```bash
# 1. Login and build image
az acr login --name pqzcrftacr

COMMIT_SHA=$(git rev-parse --short HEAD)
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"

docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-frontend:latest \
  -t ${ACR_LOGIN}/quizcrafter-frontend:${COMMIT_SHA} \
  ./frontend

docker push ${ACR_LOGIN}/quizcrafter-frontend --all-tags

# 2. Switch App Service to Docker container mode
az webapp config set \
  --name p-qzcrft-frontend --resource-group p-qzcrft \
  --linux-fx-version "DOCKER|${ACR_LOGIN}/quizcrafter-frontend:latest"

# 3. Add container settings
az webapp config appsettings set \
  --name p-qzcrft-frontend --resource-group p-qzcrft \
  --settings \
    WEBSITES_PORT="80" \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE="false"

# 4. Remove Node.js-specific settings
az webapp config appsettings delete \
  --name p-qzcrft-frontend --resource-group p-qzcrft \
  --setting-names WEBSITE_NODE_DEFAULT_VERSION SCM_DO_BUILD_DURING_DEPLOYMENT

# 5. Clear PM2 startup command (must use resource update; --startup-file "" has no effect)
az resource update \
  --ids /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-frontend/config/web \
  --set properties.appCommandLine=""

# 6. Restart
az webapp restart --name p-qzcrft-frontend --resource-group p-qzcrft
```

### Issues Encountered

| #   | Issue                                                                      | Resolution                                                                            |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | `az webapp config set --startup-file ""` did not clear `appCommandLine`    | Used `az resource update --set properties.appCommandLine=""` instead                  |
| 2   | Container started but showed `/docker-entrypoint.sh: exec: pm2: not found` | Root cause was issue #1 — PM2 startup command was still injected into nginx container |

### Verification — Confirmed 2026-02-25

**Log stream output after fix:**

```text
2026-02-25T09:24:58Z /docker-entrypoint.sh: Configuration complete; ready for start up
2026-02-25T09:24:58Z nginx/1.29.5 start worker processes
2026-02-25T09:24:59Z "GET /robots933456.txt HTTP/1.1" 200 462  (Azure health probe)
2026-02-25T09:25:00Z "GET / HTTP/1.1" 200 462
```

**Result:** nginx 1.29.5 running, SPA routing active via `try_files $uri /index.html =404;`. Azure health probe and root both return HTTP 200.

### Post-Migration State

| Setting                               | Before                                           | After                                     |
| ------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `linuxFxVersion`                      | `NODE\|24-lts`                                   | `DOCKER\|.../quizcrafter-frontend:latest` |
| `appCommandLine`                      | `pm2 serve /home/site/wwwroot --no-daemon --spa` | `` (empty)                                |
| `WEBSITES_PORT`                       | not set                                          | `80`                                      |
| `WEBSITES_ENABLE_APP_SERVICE_STORAGE` | not set                                          | `false`                                   |
| `WEBSITE_NODE_DEFAULT_VERSION`        | `~20`                                            | removed                                   |
| `SCM_DO_BUILD_DURING_DEPLOYMENT`      | `false`                                          | removed                                   |
| Web server                            | PM2 (Node.js)                                    | nginx 1.29.5                              |

---

## Step 13: Logging Audit & Improvements

**Date:** 2026-02-26
**Deployer:** Marius Solaas

Audited the Log Analytics workspace (`p-qzcrft-ws`) and diagnostic settings for both App Services. Logs were flowing but three issues were found and fixed.

### Audit Results

| Component | Finding |
| --- | --- |
| `p-qzcrft-ws` workspace | Healthy — West Europe, 30-day retention, Pay-per-GB |
| Backend diagnostic settings | All 4 categories enabled (`AppServiceHTTPLogs`, `AppServiceConsoleLogs`, `AppServiceAppLogs`, `AppServicePlatformLogs`) |
| Frontend diagnostic settings | Missing `AppServicePlatformLogs` — fixed in this step |
| Backend HTTP logs | Active — 418 entries/hour confirmed via KQL |
| Frontend HTTP logs | Active — 380 entries/hour confirmed via KQL |
| Backend console logs | Only 158 entries/24h — root cause: production log level was `WARNING`, silencing all `INFO`-level structlog output from `LoggingMiddleware` |
| Frontend console logs | 12,345 entries/24h — all nginx access log noise, redundant with `AppServiceHTTPLogs` |
| Application Insights | Not provisioned — noted as future improvement |

### Issues Found & Fixed

| # | Issue | Fix | File |
| --- | --- | --- | --- |
| 1 | Production log level `WARNING` silenced all `LoggingMiddleware` output (request IDs, durations, user context logged at `INFO`) | Changed `"production": logging.WARNING` → `"production": logging.INFO` | `backend/src/config.py` |
| 2 | nginx access log writing 12k+ plain-text entries/day to `AppServiceConsoleLogs` — redundant with platform `AppServiceHTTPLogs` | Added `access_log off; error_log /dev/stderr warn;` | `frontend/nginx.conf` |
| 3 | `AppServicePlatformLogs` disabled on frontend (container restart/crash events not captured) | Updated diagnostic settings via Azure CLI | Azure (no code change) |

### Fix 1 — Backend Log Level (`backend/src/config.py`)

```python
# Before
"production": logging.WARNING,

# After
"production": logging.INFO,
```

### Fix 2 — nginx Access Log (`frontend/nginx.conf`)

```nginx
# Added to server block:
access_log off;
error_log /dev/stderr warn;
```

### Fix 3 — Frontend Diagnostic Settings (Azure CLI)

```bash
az monitor diagnostic-settings update \
  --name p-qzcrft-frontend-diagnostics \
  --resource /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-frontend \
  --logs '[
    {"category":"AppServiceHTTPLogs","enabled":true},
    {"category":"AppServiceConsoleLogs","enabled":true},
    {"category":"AppServicePlatformLogs","enabled":true}
  ]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

**Result:** Applied immediately — no image rebuild required.

### Docker Image Rebuild Required

Fixes 1 and 2 require rebuilt images (pending deployment):

```bash
az acr login --name pqzcrftacr
COMMIT_SHA=$(git rev-parse --short HEAD)
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"

docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-backend:latest \
  -t ${ACR_LOGIN}/quizcrafter-backend:${COMMIT_SHA} \
  ./backend
docker push ${ACR_LOGIN}/quizcrafter-backend --all-tags
az webapp restart --name p-qzcrft-backend --resource-group p-qzcrft

docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-frontend:latest \
  -t ${ACR_LOGIN}/quizcrafter-frontend:${COMMIT_SHA} \
  ./frontend
docker push ${ACR_LOGIN}/quizcrafter-frontend --all-tags
az webapp restart --name p-qzcrft-frontend --resource-group p-qzcrft
```

### Verification (after image rebuild)

```kql
// Confirm structured JSON logs now flowing from backend
AppServiceConsoleLogs
| where TimeGenerated > ago(10m)
| where _ResourceId contains "backend"
| where ResultDescription startswith "{"
| extend p = parse_json(ResultDescription)
| project TimeGenerated, level=p.level, event=p.event, request_id=p.request_id, duration_ms=p.duration_ms
```

### Log Analytics GUI — How to Query

**Azure Portal** → **Log Analytics workspaces** → `p-qzcrft-ws` → **Logs**

Useful queries:

```kql
// HTTP traffic summary (last 1h)
AppServiceHTTPLogs
| where TimeGenerated > ago(1h)
| summarize count() by _ResourceId, CsMethod, ScStatus
| order by count_ desc

// Parse backend structured logs (request tracing)
AppServiceConsoleLogs
| where _ResourceId contains "backend"
| where ResultDescription startswith "{"
| extend p = parse_json(ResultDescription)
| project TimeGenerated, level=p.level, event=p.event,
    request_id=p.request_id, method=p.method, path=p.path,
    status=p.status_code, duration_ms=p.duration_ms, user_id=p.user_id

// Container restart/crash events
AppServicePlatformLogs
| where TimeGenerated > ago(24h)
| project TimeGenerated, _ResourceId, Level, ResultDescription
| order by TimeGenerated desc

// Error rate by hour
AppServiceHTTPLogs
| where TimeGenerated > ago(24h)
| summarize errors=countif(ScStatus >= 500), total=count()
    by bin(TimeGenerated, 1h), _ResourceId
| order by TimeGenerated desc
```

**Note:** `az webapp log tail` returns 403 from local machine (SCM endpoint is IP-restricted). Use **Azure Portal** → **App Services** → `p-qzcrft-backend` → **Monitoring** → **Log stream** for real-time logs.
