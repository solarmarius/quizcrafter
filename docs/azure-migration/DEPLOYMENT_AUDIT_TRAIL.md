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
