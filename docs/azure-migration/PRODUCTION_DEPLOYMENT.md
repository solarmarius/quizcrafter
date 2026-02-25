# QuizCrafter Production Deployment Guide

**Target Environment:** Azure App Service (Production)
**Resource Group:** `p-qzcrft`
**Date:** 2026-02-19
**Subscription:** p-qzcrft (`f2d616a4-6e35-4999-aa17-22fa2c83dca5`)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Resource Inventory](#resource-inventory)
4. [Phase 1: Networking Setup — COMPLETED](#phase-1-networking-setup--completed)
5. [Phase 2: Database Setup](#phase-2-database-setup)
6. [Phase 3: Key Vault Secrets](#phase-3-key-vault-secrets)
7. [Phase 4: Build and Push Backend Image](#phase-4-build-and-push-backend-image)
8. [Phase 5: Configure Backend App Service](#phase-5-configure-backend-app-service)
9. [Phase 6: Deploy Frontend](#phase-6-deploy-frontend)
10. [Phase 7: Database Migrations](#phase-7-database-migrations)
11. [Phase 8: Final Verification](#phase-8-final-verification)
12. [Troubleshooting](#troubleshooting)
13. [Rollback Procedures](#rollback-procedures)
14. [Quick Reference](#quick-reference)

---

## Architecture Overview

```
                        Azure Cloud (p-qzcrft)
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │            App Service Plan: p-qzcrft-asp (PremiumV3 P0v3)        │  │
│  │                                                                    │  │
│  │  ┌──────────────────────────┐   ┌──────────────────────────┐      │  │
│  │  │  p-qzcrft-backend        │   │  p-qzcrft-frontend       │      │  │
│  │  │  (Docker container)      │   │  (Docker container)      │      │  │
│  │  │                          │   │                          │      │  │
│  │  │  • FastAPI + Python 3.10 │   │  • React SPA             │      │  │
│  │  │  • Port 8000             │   │  • nginx:1 on port 80    │      │  │
│  │  │  • System Managed ID     │   │  • SPA routing           │      │  │
│  │  │  • VNet integrated       │   │  • System Managed ID     │      │  │
│  │  │  • staging slot          │   │  • staging slot          │      │  │
│  │  └──────────┬───────────────┘   └──────────────────────────┘      │  │
│  └─────────────┼──────────────────────────────────────────────────────┘  │
│                │                                                         │
│                │ VNet Integration (BackendSubnet)                        │
│                ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │          VNet: p-qzcrft-network-vnet                    │            │
│  │          (RG: p-qzcrft-network)                         │            │
│  │                                                         │            │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐ │            │
│  │  │ FrontendSubnet      │  │ BackendSubnet             │ │            │
│  │  │ 172.17.19.128/26    │  │ 172.17.19.192/26          │ │            │
│  │  │                     │  │                            │ │            │
│  │  │ • Private Endpoint  │  │ • App Service VNet         │ │            │
│  │  │   (p-qzcrft-sql-pe) │  │   Integration              │ │            │
│  │  └─────────┬───────────┘  └──────────────────────────┘ │            │
│  └────────────┼────────────────────────────────────────────┘            │
│               │                                                         │
│               ▼                                                         │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL Flex       │  │ Key Vault         │  │ Container        │  │
│  │ p-qzcrft-psql        │  │ p-qzcrft-kv      │  │ Registry         │  │
│  │                      │  │                    │  │ pqzcrftacr       │  │
│  │ • v18                │  │ • RBAC mode       │  │                  │  │
│  │ • GP D2ds_v5         │  │ • 9 secrets       │  │ • Basic SKU     │  │
│  │ • Public access OFF  │  │ • Public access   │  │ • Admin disabled│  │
│  │ • Private endpoint   │  │                    │  │ • AcrPull role  │  │
│  └──────────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                          │
│  ┌──────────────────────┐                                               │
│  │ Log Analytics         │   External Services:                         │
│  │ p-qzcrft-ws          │   • Canvas LMS (OAuth)                       │
│  │                      │   • Azure OpenAI                              │
│  └──────────────────────┘                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

### Network Flow

```
User Browser
    │
    ├──► p-qzcrft-frontend (public HTTPS)
    │         Static React SPA
    │
    └──► p-qzcrft-backend (public HTTPS)
              │
              │ VNet Integration (BackendSubnet)
              │
              ├──► Private Endpoint (FrontendSubnet)
              │         │
              │         └──► p-qzcrft-psql (PostgreSQL, private only)
              │
              ├──► p-qzcrft-kv (Key Vault, public/RBAC)
              │
              ├──► Canvas LMS API (external HTTPS)
              │
              └──► Azure OpenAI (external HTTPS)
```

---

## Pre-Deployment Checklist

### Resolved by Azure Admin (verified 2026-02-19)

- [x] **1. Private DNS Zone** — Created in separate subscription/resource group `p-qzcrft-network`. Links `privatelink.postgres.database.azure.com` to `p-qzcrft-network-vnet` with A record for `p-qzcrft-psql`. Will validate via DNS resolution from backend after container deployment.

- [x] **2. Subnet Delegation** — `BackendSubnet` (172.17.19.192/26) now has `Microsoft.Web/serverFarms` delegation. Verified via `az network vnet subnet show`.

- [x] **3. App Service VNet Integration** — `p-qzcrft-backend` is now integrated with `BackendSubnet` in `p-qzcrft-network-vnet`. Verified: `virtualNetworkSubnetId` returns the BackendSubnet resource ID.

- [x] **5. Key Vault RBAC Role** — `Key Vault Secrets User` role assigned to backend managed identity on `p-qzcrft-kv`. Verified via `az role assignment list`.

### Remaining: To Be Done During Deployment

- [x] **4. Application Database Created** — `quizcrafter` database exists on `p-qzcrft-psql`. Verified via `az postgres flexible-server db list` on 2026-02-19.

- [ ] **6. PostgreSQL Admin Password Needed**
  - **Issue:** The PostgreSQL admin user is `sqladmin`. We need the password to store in Key Vault for the backend to connect.
  - **Required action:** Obtain from admin, or reset and share securely.

### REQUIRED: Credentials to Collect

- [ ] **7. Canvas LMS OAuth Credentials**
  - `CANVAS_CLIENT_ID` - Canvas developer application ID
  - `CANVAS_CLIENT_SECRET` - Canvas developer application secret
  - The Canvas redirect URI will be: `https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/auth/callback/canvas`
  - This redirect URI must be registered in the Canvas developer application settings.

- [ ] **8. Azure OpenAI Credentials**
  - `AZURE_OPENAI_API_KEY` - API key for the Azure OpenAI resource
  - `AZURE_OPENAI_ENDPOINT` - Endpoint URL (e.g., `https://<resource>.openai.azure.com/`)
  - `AZURE_OPENAI_API_VERSION` - API version (e.g., `2024-02-15-preview`)

### OPTIONAL: Permissions Check

- [ ] **9. Verify Deployer Permissions**
  - The person running the deployment needs:
    - `Contributor` role on `p-qzcrft` resource group (to configure App Services, push to ACR)
    - `Key Vault Secrets Officer` role on `p-qzcrft-kv` (to set secrets)

### INFORMATIONAL: Current State Observations

| Observation | Detail |
|-------------|--------|
| Backend runtime | Set to `PYTHON\|3.14` — will be changed to Docker container mode |
| Frontend runtime | Set to `NODE\|24-lts` — will be changed to Docker container mode |
| ACR admin user | Disabled — will use managed identity (AcrPull role already assigned) |
| ACR login server | `pqzcrftacr-afb8abgzafb6fxf5.azurecr.io` (custom format) |
| App Service Plan | PremiumV3 P0v3 — supports VNet integration |
| Backend hostname | `p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net` |
| Frontend hostname | `p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net` |

---

## Resource Inventory

### Resources in `p-qzcrft` (Production)

| Resource | Name | Type | SKU/Config |
|----------|------|------|------------|
| App Service Plan | `p-qzcrft-asp` | Microsoft.Web/serverfarms | PremiumV3 P0v3, Linux, 1 instance |
| Backend App Service | `p-qzcrft-backend` | Microsoft.Web/sites | Docker container, managed identity |
| Backend Staging Slot | `p-qzcrft-backend/staging` | Microsoft.Web/sites/slots | Available for blue-green |
| Frontend App Service | `p-qzcrft-frontend` | Microsoft.Web/sites | Docker container, nginx:1, managed identity |
| Frontend Staging Slot | `p-qzcrft-frontend/staging` | Microsoft.Web/sites/slots | Available for blue-green |
| Container Registry | `pqzcrftacr` | Microsoft.ContainerRegistry | Basic, admin disabled |
| Key Vault | `p-qzcrft-kv` | Microsoft.KeyVault | RBAC authorization, soft delete |
| PostgreSQL | `p-qzcrft-psql` | Microsoft.DBforPostgreSQL | v18, GP D2ds_v5, 32GB, public access OFF |
| Private Endpoint | `p-qzcrft-sql-pe` | Microsoft.Network/privateEndpoints | PostgreSQL, in FrontendSubnet |
| Log Analytics | `p-qzcrft-ws` | Microsoft.OperationalInsights | Pay-per-GB |

### Resources in `p-qzcrft-network`

| Resource | Name | Config |
|----------|------|--------|
| Virtual Network | `p-qzcrft-network-vnet` | 172.17.19.128/25 |
| Subnet | `FrontendSubnet` | 172.17.19.128/26 (hosts private endpoint) |
| Subnet | `BackendSubnet` | 172.17.19.192/26 (will host App Service VNet integration) |

---

## Phase 1: Networking Setup — COMPLETED

> All networking steps were completed by the Azure admin on 2026-02-19.

| Step | Status | Detail |
|------|--------|--------|
| 1.1 Private DNS Zone | Done | Created in `p-qzcrft-network` (separate subscription). Zone `privatelink.postgres.database.azure.com` linked to VNet with A record for `p-qzcrft-psql`. |
| 1.2 Subnet Delegation | Done | `BackendSubnet` delegated to `Microsoft.Web/serverFarms`. |
| 1.3 VNet Integration | Done | `p-qzcrft-backend` integrated with `BackendSubnet` in `p-qzcrft-network-vnet`. |
| 1.4 Key Vault RBAC | Done | `Key Vault Secrets User` role assigned to backend managed identity on `p-qzcrft-kv`. |

> **Note:** The frontend App Service does NOT need VNet integration. It only serves static files. All API calls go from the user's browser directly to the backend.

### Post-Deploy Verification (DNS resolution)

DNS resolution through the private endpoint will be validated after the backend container is deployed (Phase 5). From inside the container:

```bash
az webapp ssh --name p-qzcrft-backend --resource-group p-qzcrft

# Inside the SSH session:
nslookup p-qzcrft-psql.postgres.database.azure.com
# Expected: resolves to a private IP (172.17.19.xxx), NOT a public IP
```

---

## Phase 2: Database Setup

> **Prerequisite:** Phase 1 networking must be complete if using Option C. Otherwise, use Option A.

The PostgreSQL server has public access disabled. We need to create the `quizcrafter` database.

### Option A: Temporarily Enable Public Access (simplest)

```bash
# Enable public access temporarily
az postgres flexible-server update \
  --name p-qzcrft-psql \
  --resource-group p-qzcrft \
  --public-access Enabled

# Add your IP to the firewall
MY_IP=$(curl -s ifconfig.me)
az postgres flexible-server firewall-rule create \
  --name p-qzcrft-psql \
  --resource-group p-qzcrft \
  --rule-name TempDeployAccess \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP

# Create the database
az postgres flexible-server db create \
  --server-name p-qzcrft-psql \
  --resource-group p-qzcrft \
  --database-name quizcrafter

# IMPORTANT: Clean up immediately
az postgres flexible-server firewall-rule delete \
  --name p-qzcrft-psql \
  --resource-group p-qzcrft \
  --rule-name TempDeployAccess --yes

az postgres flexible-server update \
  --name p-qzcrft-psql \
  --resource-group p-qzcrft \
  --public-access Disabled
```

### Option B: Via Azure Portal

1. Go to Azure Portal > `p-qzcrft-psql` > Databases
2. Click "+ Add" and create `quizcrafter`

### Option C: Via Backend SSH (after VNet integration)

```bash
# SSH into the backend (only works after Phase 1 + Phase 5 with container deployed)
az webapp ssh --name p-qzcrft-backend --resource-group p-qzcrft

# Inside the container:
# psql "host=p-qzcrft-psql.postgres.database.azure.com port=5432 dbname=postgres user=sqladmin sslmode=require"
# CREATE DATABASE quizcrafter;
# \q
```

#### Verification 2

```bash
# List databases (requires public access or VNet path)
az postgres flexible-server db list \
  --server-name p-qzcrft-psql \
  --resource-group p-qzcrft \
  --query "[].name" -o tsv
```

**Expected result:** Output includes `quizcrafter` alongside system databases.

---

## Phase 3: Key Vault Secrets

> **Important:** Key Vault `p-qzcrft-kv` uses **RBAC authorization**, not access policies. Role assignments are required instead of access policies.

### 3.1 Grant Backend Managed Identity Key Vault Access — COMPLETED

> Done by Azure admin on 2026-02-19. `Key Vault Secrets User` role assigned to backend managed identity. Verified via `az role assignment list`.

### 3.2 Populate Secrets

All secrets must be populated before the backend can start. Collect the values from the admin and Canvas/OpenAI configuration.

```bash
KV="p-qzcrft-kv"

# 1. Application secret key (generate new)
az keyvault secret set --vault-name $KV \
  --name "SECRET-KEY" \
  --value "$(openssl rand -hex 32)"

# 2. PostgreSQL password (obtain from admin)
az keyvault secret set --vault-name $KV \
  --name "POSTGRES-PASSWORD" \
  --value "<POSTGRES_ADMIN_PASSWORD>"

# 3. Canvas OAuth credentials (from Canvas LMS developer keys)
az keyvault secret set --vault-name $KV \
  --name "CANVAS-CLIENT-ID" \
  --value "<CANVAS_CLIENT_ID>"

az keyvault secret set --vault-name $KV \
  --name "CANVAS-CLIENT-SECRET" \
  --value "<CANVAS_CLIENT_SECRET>"

az keyvault secret set --vault-name $KV \
  --name "CANVAS-BASE-URL" \
  --value "https://uit.instructure.com"

az keyvault secret set --vault-name $KV \
  --name "CANVAS-REDIRECT-URI" \
  --value "https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/auth/callback/canvas"

# 4. Azure OpenAI credentials
az keyvault secret set --vault-name $KV \
  --name "AZURE-OPENAI-API-KEY" \
  --value "<AZURE_OPENAI_API_KEY>"

az keyvault secret set --vault-name $KV \
  --name "AZURE-OPENAI-ENDPOINT" \
  --value "<AZURE_OPENAI_ENDPOINT_URL>"

az keyvault secret set --vault-name $KV \
  --name "AZURE-OPENAI-API-VERSION" \
  --value "2024-02-15-preview"
```

#### Verification 3.2

```bash
# List all secrets (names only, not values)
az keyvault secret list --vault-name p-qzcrft-kv --query "[].name" -o tsv
```

**Expected result:** All 9 secrets listed:
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

---

## Phase 4: Build and Push Backend Image

> **Prerequisite:** Docker installed locally, Azure CLI authenticated.

### 4.1 Login to ACR

The container registry has admin user disabled. Authentication is via Azure CLI:

```bash
az acr login --name pqzcrftacr
```

> **Note:** The ACR login server is `pqzcrftacr-afb8abgzafb6fxf5.azurecr.io` (Azure-generated format). This is NOT the typical `<name>.azurecr.io` pattern.

### 4.2 Build Backend Docker Image

```bash
# From the project root directory
COMMIT_SHA=$(git rev-parse --short HEAD)
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"

# Build for linux/amd64 (required for App Service)
docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-backend:latest \
  -t ${ACR_LOGIN}/quizcrafter-backend:${COMMIT_SHA} \
  ./backend
```

### 4.3 Push to ACR

```bash
docker push ${ACR_LOGIN}/quizcrafter-backend --all-tags
```

#### Verification 4

```bash
# Verify image tags in ACR
az acr repository show-tags \
  --name pqzcrftacr \
  --repository quizcrafter-backend \
  --output table

# Verify image details
az acr repository show-manifests \
  --name pqzcrftacr \
  --repository quizcrafter-backend \
  --output table
```

**Expected result:** `latest` and the commit SHA tag are listed.

---

## Phase 5: Configure Backend App Service

> **Prerequisite:** Phase 1 (networking), Phase 3 (Key Vault), and Phase 4 (image pushed).

### 5.1 Switch to Docker Container Mode

The backend is currently set to `PYTHON|3.14` runtime. It needs to run as a Docker container.

```bash
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"

# Set the container image
az webapp config set \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --linux-fx-version "DOCKER|${ACR_LOGIN}/quizcrafter-backend:latest"
```

### 5.2 Configure ACR Pull via Managed Identity

Since ACR admin is disabled, the App Service uses its managed identity (which already has `AcrPull` role) to pull images:

```bash
# Set ACR URL (no username/password needed with managed identity)
az webapp config appsettings set \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --settings \
    DOCKER_REGISTRY_SERVER_URL="https://pqzcrftacr-afb8abgzafb6fxf5.azurecr.io" \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE="false"

# Enable managed identity for ACR pull
az resource update \
  --ids /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-backend/config/web \
  --set properties.acrUseManagedIdentityCreds=true
```

#### Verification 5.2

```bash
az resource show \
  --ids /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-backend/config/web \
  --query "properties.acrUseManagedIdentityCreds" -o tsv
```

**Expected result:** `true`

---

### 5.3 Configure Application Settings

```bash
FRONTEND_URL="https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net"
KV="p-qzcrft-kv"

az webapp config appsettings set \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
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
```

> **Key notes:**
> - `WEBSITES_PORT=8000` is critical — FastAPI listens on port 8000, but Azure expects port 80 by default. This was a lesson learned from the test deployment.
> - `WEBSITE_VNET_ROUTE_ALL=1` ensures all outbound traffic routes through the VNet, enabling private DNS resolution.
> - `@Microsoft.KeyVault(...)` references are resolved at runtime by the App Service platform.

---

### 5.4 Configure Health Check and Security Settings

```bash
az webapp config set \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --always-on true \
  --ftps-state Disabled \
  --http20-enabled true \
  --min-tls-version 1.2

# Set health check path
az webapp config set \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --generic-configurations '{"healthCheckPath": "/utils/health-check/"}'
```

#### Verification 5.4

```bash
az webapp config show \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --query "{linuxFxVersion:linuxFxVersion, alwaysOn:alwaysOn, ftpsState:ftpsState, http20Enabled:http20Enabled, healthCheckPath:healthCheckPath}" \
  -o json
```

**Expected result:**
```json
{
  "linuxFxVersion": "DOCKER|pqzcrftacr-afb8abgzafb6fxf5.azurecr.io/quizcrafter-backend:latest",
  "alwaysOn": true,
  "ftpsState": "Disabled",
  "http20Enabled": true,
  "healthCheckPath": "/utils/health-check/"
}
```

---

### 5.5 Enable Diagnostic Logging

```bash
# Get Log Analytics workspace ID
WS_ID=$(az monitor log-analytics workspace show \
  --workspace-name p-qzcrft-ws \
  --resource-group p-qzcrft \
  --query id -o tsv)

# Create diagnostic settings
az monitor diagnostic-settings create \
  --name p-qzcrft-backend-diagnostics \
  --resource /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-backend \
  --workspace "$WS_ID" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true},{"category":"AppServiceAppLogs","enabled":true},{"category":"AppServicePlatformLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

#### Verification 5.5

```bash
az monitor diagnostic-settings list \
  --resource /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-backend \
  --query "[].name" -o tsv
```

**Expected result:** `p-qzcrft-backend-diagnostics`

---

### 5.6 Restart Backend and Verify Container Startup

```bash
# Restart to apply all configuration changes
az webapp restart --name p-qzcrft-backend --resource-group p-qzcrft

# Wait 60-90 seconds for the container to pull and start

# Check container logs for startup
az webapp log tail --name p-qzcrft-backend --resource-group p-qzcrft
# Press Ctrl+C after you see the FastAPI startup message

# Test health endpoint
curl -s https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/utils/health-check/
```

**Expected result:**
- Logs show FastAPI starting with 4 workers on port 8000
- Health check returns `true`
- No Key Vault reference errors in logs

#### Troubleshooting 5.6

If the container fails to start:

```bash
# Check detailed container logs
az webapp log download \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --log-file /tmp/backend-logs.zip

# Common issues:
# 1. "Container didn't respond to HTTP pings on port 8000"
#    → Verify WEBSITES_PORT=8000 is set
# 2. "ImagePullBackOff" or ACR authentication errors
#    → Verify acrUseManagedIdentityCreds=true and AcrPull role
# 3. "KeyVault reference failed"
#    → Verify Key Vault Secrets User role assignment
# 4. "Connection refused" to PostgreSQL
#    → Verify VNet integration and private DNS zone
```

---

## Phase 6: Deploy Frontend

The frontend uses a two-stage Docker build: `node:20` builds the Vite/React app, `nginx:1` serves the static bundle on port 80. `VITE_API_URL` is baked in at build time from `frontend/.env.production`.

> **Note:** The Dockerfile declares `ARG VITE_API_URL` with **no default value**. This is intentional and critical. If you write `ARG VITE_API_URL=${VITE_API_URL}`, Docker defaults the arg to an empty string when no `--build-arg` is passed. Docker ARG values are exposed as process environment variables during `RUN` commands, and Vite gives process env vars higher priority than `.env` files — so the empty string would override `frontend/.env.production` and break the build. With no default (`ARG VITE_API_URL`), the variable is unset when not provided, and Vite correctly reads `frontend/.env.production`.

### 6.1 Build and Push Frontend Image

```bash
az acr login --name pqzcrftacr

COMMIT_SHA=$(git rev-parse --short HEAD)
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"

# Build for linux/amd64 (required for App Service)
# VITE_API_URL is read from frontend/.env.production at build time
docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-frontend:latest \
  -t ${ACR_LOGIN}/quizcrafter-frontend:${COMMIT_SHA} \
  ./frontend

docker push ${ACR_LOGIN}/quizcrafter-frontend --all-tags
```

#### Verification 6.1

```bash
az acr repository show-tags \
  --name pqzcrftacr \
  --repository quizcrafter-frontend \
  --output table
# Expected: latest and commit SHA listed
```

---

### 6.2 Configure Frontend App Service

```bash
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"

# Switch to Docker container mode
az webapp config set \
  --name p-qzcrft-frontend \
  --resource-group p-qzcrft \
  --linux-fx-version "DOCKER|${ACR_LOGIN}/quizcrafter-frontend:latest"

# Clear startup command (MUST use resource update — --startup-file "" has no effect)
az resource update \
  --ids /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-frontend/config/web \
  --set properties.appCommandLine=""

# Container settings
az webapp config appsettings set \
  --name p-qzcrft-frontend \
  --resource-group p-qzcrft \
  --settings \
    WEBSITES_PORT="80" \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE="false"

# Security settings
az webapp config set \
  --name p-qzcrft-frontend \
  --resource-group p-qzcrft \
  --always-on true \
  --ftps-state Disabled \
  --http20-enabled true \
  --min-tls-version 1.2
```

> **Key notes:**
> - `WEBSITES_PORT=80` — nginx listens on port 80.
> - `appCommandLine` must be cleared via `az resource update` — the `--startup-file ""` flag on `az webapp config set` does not clear it.
> - SPA routing is handled by nginx's `try_files $uri /index.html =404;` directive. No PM2 needed.

#### Verification 6.2

```bash
az webapp config show \
  --name p-qzcrft-frontend --resource-group p-qzcrft \
  --query "{linuxFxVersion:linuxFxVersion, appCommandLine:appCommandLine}" -o json
# Expected:
# { "linuxFxVersion": "DOCKER|...quizcrafter-frontend:latest", "appCommandLine": "" }
```

---

### 6.3 Start and Verify

```bash
az webapp restart --name p-qzcrft-frontend --resource-group p-qzcrft

# After ~60s:
curl -s -o /dev/null -w "%{http_code}" \
  https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net

curl -s -o /dev/null -w "%{http_code}" \
  https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net/dashboard
```

**Expected result:** Both return `200`. Log stream should show `nginx/1.x.x start worker processes` with no PM2 errors.

---

### 6.4 Enable Frontend Diagnostics

```bash
WS_ID=$(az monitor log-analytics workspace show \
  --workspace-name p-qzcrft-ws \
  --resource-group p-qzcrft \
  --query id -o tsv)

az monitor diagnostic-settings create \
  --name p-qzcrft-frontend-diagnostics \
  --resource /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-frontend \
  --workspace "$WS_ID" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

---

## Phase 7: Database Migrations

> **Prerequisite:** Backend container is running and can reach PostgreSQL (Phase 1 + Phase 5 complete).

### 7.1 Run Alembic Migrations

```bash
# SSH into the backend container
az webapp ssh --name p-qzcrft-backend --resource-group p-qzcrft

# Inside the container, run the migrations:
alembic upgrade head

# Verify the migration version
alembic current

# Check that tables were created
python -c "from src.database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"

# Exit SSH
exit
```

#### Verification 7.1

The following tables should exist after migration:

| Table | Purpose |
|-------|---------|
| `alembic_version` | Migration tracking |
| `user` | Canvas users |
| `quiz` | Quiz definitions |
| `question` | Generated questions |
| `quizcollaborator` | Quiz sharing |
| `quizinvite` | Invite links |

**Expected migrations (6 total):**
1. Initial migration
2. add_module_id_to_questions
3. add_quiz_sharing_tables
4. add_custom_instructions_to_quiz
5. add_rejection_feedback_fields
6. add_multiple_answer_to_questiontype_enum

---

## Phase 8: Final Verification

### 8.1 Backend Health

```bash
# Health check endpoint
curl -s https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/utils/health-check/
# Expected: true

# API documentation loads
curl -s -o /dev/null -w "%{http_code}" \
  https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/docs
# Expected: 200

# OpenAPI spec is available
curl -s -o /dev/null -w "%{http_code}" \
  https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/openapi.json
# Expected: 200
```

### 8.2 Frontend

```bash
# Homepage loads
curl -s -o /dev/null -w "%{http_code}" \
  https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net
# Expected: 200

# SPA routing works
curl -s -o /dev/null -w "%{http_code}" \
  https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net/login
# Expected: 200
```

### 8.3 Key Vault References

```bash
# Check that Key Vault references resolved successfully
az webapp config appsettings list \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --query "[?contains(value, 'KeyVault')].{name:name, status:value}" -o table

# If any show "KeyVaultReferenceError", check:
# 1. Key Vault role assignment
# 2. Secret exists in Key Vault
# 3. Secret name matches exactly
```

### 8.4 Database Connectivity

```bash
# Check backend logs for database connection errors
az webapp log tail --name p-qzcrft-backend --resource-group p-qzcrft
# Look for: "connection refused", "timeout", "SSL" errors
```

### 8.5 End-to-End Manual Testing

Open the frontend URL in a browser and verify:

- [ ] Frontend loads with the QuizCrafter UI
- [ ] Canvas OAuth login button works (redirects to Canvas)
- [ ] After Canvas login, user is redirected back
- [ ] Course list displays correctly
- [ ] Quiz creation form loads
- [ ] Question generation works (tests Azure OpenAI connectivity)
- [ ] Question review/approval works
- [ ] Export to Canvas works

### 8.6 Monitoring

```bash
# Verify logs are flowing to Log Analytics
# (may take 5-10 minutes after first requests)
az monitor log-analytics query \
  --workspace $(az monitor log-analytics workspace show --workspace-name p-qzcrft-ws --resource-group p-qzcrft --query customerId -o tsv) \
  --analytics-query "AppServiceHTTPLogs | take 5" \
  -o table
```

---

## Troubleshooting

### Container Won't Start

```bash
# View container startup logs
az webapp log tail --name p-qzcrft-backend --resource-group p-qzcrft

# Download full logs
az webapp log download --name p-qzcrft-backend --resource-group p-qzcrft --log-file /tmp/backend-logs.zip

# Check container settings
az webapp config show --name p-qzcrft-backend --resource-group p-qzcrft \
  --query "{linuxFxVersion:linuxFxVersion, appCommandLine:appCommandLine}" -o json
```

**Common causes:**
| Symptom | Cause | Fix |
|---------|-------|-----|
| "Container didn't respond to HTTP pings" | Wrong port | Set `WEBSITES_PORT=8000` |
| "ImagePullBackOff" | ACR auth failure | Verify `acrUseManagedIdentityCreds=true` and AcrPull role |
| "unauthorized: authentication required" | ACR credentials | Check managed identity has AcrPull on the correct ACR |

### Key Vault Reference Errors

```bash
# Check which references failed
az webapp config appsettings list --name p-qzcrft-backend --resource-group p-qzcrft -o json | \
  python3 -c "import json,sys; [print(f'{s[\"name\"]}: ERROR') for s in json.load(sys.stdin) if 'Error' in s.get('value','')]"

# Verify managed identity has correct role
az role assignment list \
  --assignee 2c3362e9-07e1-416d-985a-af3c34f1e75f \
  --scope /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.KeyVault/vaults/p-qzcrft-kv \
  -o table
```

### Database Connection Failed

```bash
# SSH into backend to test connectivity
az webapp ssh --name p-qzcrft-backend --resource-group p-qzcrft

# Test DNS resolution
nslookup p-qzcrft-psql.postgres.database.azure.com
# Should return private IP, NOT public IP

# Test TCP connectivity
python3 -c "import socket; s=socket.create_connection(('p-qzcrft-psql.postgres.database.azure.com', 5432), timeout=5); print('Connected!'); s.close()"
```

**Common causes:**
| Symptom | Cause | Fix |
|---------|-------|-----|
| DNS resolves to public IP | Missing private DNS zone | Create DNS zone and A record (Phase 1.1) |
| DNS doesn't resolve | VNet not linked to DNS zone | Link DNS zone to VNet |
| Connection timeout | No VNet integration | Enable VNet integration (Phase 1.3) |
| Authentication failed | Wrong password | Check POSTGRES-PASSWORD in Key Vault |

### Frontend 404 on Routes

nginx handles SPA routing via `try_files $uri /index.html =404;`. If you're seeing 404s:

```bash
# Verify appCommandLine is empty (must not contain PM2 or any startup command)
az webapp config show --name p-qzcrft-frontend --resource-group p-qzcrft \
  --query "appCommandLine" -o tsv
# Expected: (empty)

# If appCommandLine is non-empty, clear it:
az resource update \
  --ids /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft/providers/Microsoft.Web/sites/p-qzcrft-frontend/config/web \
  --set properties.appCommandLine=""
```

> **Note:** `az webapp config set --startup-file ""` does NOT clear `appCommandLine`. Must use `az resource update`.

### CORS Errors

If the browser shows CORS errors when the frontend calls the backend:

```bash
# Verify FRONTEND_HOST is set correctly
az webapp config appsettings list --name p-qzcrft-backend --resource-group p-qzcrft \
  --query "[?name=='FRONTEND_HOST'].value" -o tsv
# Expected: https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net
```

---

## Rollback Procedures

### Rollback Backend to Previous Image

```bash
# List available image tags
az acr repository show-tags --name pqzcrftacr --repository quizcrafter-backend -o table

# Set a specific image tag
az webapp config set \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --linux-fx-version "DOCKER|pqzcrftacr-afb8abgzafb6fxf5.azurecr.io/quizcrafter-backend:<TAG>"

az webapp restart --name p-qzcrft-backend --resource-group p-qzcrft
```

### Rollback Database Migrations

```bash
# SSH into backend
az webapp ssh --name p-qzcrft-backend --resource-group p-qzcrft

# Downgrade to specific revision
alembic downgrade <revision_id>
```

### Rollback Frontend

Point the App Service at a previous image tag (already in ACR) and restart:

```bash
# List available image tags
az acr repository show-tags --name pqzcrftacr --repository quizcrafter-frontend -o table

# Set a specific image tag
az webapp config set \
  --name p-qzcrft-frontend \
  --resource-group p-qzcrft \
  --linux-fx-version "DOCKER|pqzcrftacr-afb8abgzafb6fxf5.azurecr.io/quizcrafter-frontend:<TAG>"

az webapp restart --name p-qzcrft-frontend --resource-group p-qzcrft
```

To rebuild from a previous commit:

```bash
git checkout <commit>
az acr login --name pqzcrftacr
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"
docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-frontend:rollback \
  ./frontend
docker push ${ACR_LOGIN}/quizcrafter-frontend:rollback
az webapp config set --name p-qzcrft-frontend --resource-group p-qzcrft \
  --linux-fx-version "DOCKER|${ACR_LOGIN}/quizcrafter-frontend:rollback"
az webapp restart --name p-qzcrft-frontend --resource-group p-qzcrft
```

---

## Quick Reference

### URLs

| Service | URL |
|---------|-----|
| Backend | `https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net` |
| Backend API Docs | `https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/docs` |
| Backend Health | `https://p-qzcrft-backend-eab9c7dga9d4cxgv.westeurope-01.azurewebsites.net/utils/health-check/` |
| Frontend | `https://p-qzcrft-frontend-gjabc8deeeahbjh3.westeurope-01.azurewebsites.net` |
| PostgreSQL | `p-qzcrft-psql.postgres.database.azure.com` (private endpoint only) |
| Key Vault | `https://p-qzcrft-kv.vault.azure.net/` |
| ACR | `pqzcrftacr-afb8abgzafb6fxf5.azurecr.io` |

### Common Commands

```bash
# View backend logs
az webapp log tail --name p-qzcrft-backend --resource-group p-qzcrft

# View frontend logs
az webapp log tail --name p-qzcrft-frontend --resource-group p-qzcrft

# Restart backend
az webapp restart --name p-qzcrft-backend --resource-group p-qzcrft

# Restart frontend
az webapp restart --name p-qzcrft-frontend --resource-group p-qzcrft

# SSH into backend
az webapp ssh --name p-qzcrft-backend --resource-group p-qzcrft

# Check app status
az webapp show --name p-qzcrft-backend --resource-group p-qzcrft \
  --query "{state:state, hostNames:hostNames}" -o json

# Deploy new backend image
az webapp config set \
  --name p-qzcrft-backend \
  --resource-group p-qzcrft \
  --linux-fx-version "DOCKER|pqzcrftacr-afb8abgzafb6fxf5.azurecr.io/quizcrafter-backend:latest"

# Deploy new frontend image
ACR_LOGIN="pqzcrftacr-afb8abgzafb6fxf5.azurecr.io"
az acr login --name pqzcrftacr
docker build --platform linux/amd64 \
  -t ${ACR_LOGIN}/quizcrafter-frontend:latest \
  -t ${ACR_LOGIN}/quizcrafter-frontend:$(git rev-parse --short HEAD) \
  ./frontend
docker push ${ACR_LOGIN}/quizcrafter-frontend --all-tags
az webapp restart --name p-qzcrft-frontend --resource-group p-qzcrft

# List Key Vault secrets
az keyvault secret list --vault-name p-qzcrft-kv --query "[].name" -o tsv

# List ACR images (backend)
az acr repository show-tags --name pqzcrftacr --repository quizcrafter-backend -o table

# List ACR images (frontend)
az acr repository show-tags --name pqzcrftacr --repository quizcrafter-frontend -o table
```

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-19 | Claude Code | Initial document creation based on Azure CLI inspection |
| 2026-02-25 | Claude Code | Updated Phase 6 to container-based deployment (nginx:1 via ACR); updated architecture diagram, resource inventory, troubleshooting, rollback, and quick reference to reflect removal of PM2/zip approach |
