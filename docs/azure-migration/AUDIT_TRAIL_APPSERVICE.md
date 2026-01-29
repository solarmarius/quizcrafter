# Azure App Service Migration Audit Trail

**Migration Started:** 2026-01-28
**Performed By:** Claude Code (assisted)
**Azure Account:** mso270@uit.no
**Subscription:** p-qzcrft (f2d616a4-6e35-4999-aa17-22fa2c83dca5)
**Target Resource Group:** p-qzcrft-test-appservice

---

## Summary of Actions Taken

| Step | Action | Status | Azure Resource Created |
|------|--------|--------|------------------------|
| 1.1 | Verified prerequisites | Complete | N/A |
| 1.2 | Verified Azure login | Complete | N/A |
| 1.3 | Verified resource group exists | Complete | N/A (pre-existing) |
| 1.4 | Verified resource providers registered | Complete | N/A |
| 2.1 | Updated APP_SERVICE_GUIDE.md with correct resource group | Complete | N/A |
| 2.2 | Validated Bicep template (first attempt) | Complete | N/A |
| 2.3 | First deployment attempt | Failed | Resource name conflicts |
| 2.4 | Modified Bicep to reuse existing resources | Complete | N/A |
| 2.5 | Second deployment attempt | Failed | Capacity issue (West Europe) |
| 2.6 | Third deployment attempt (S1 tier) | Complete | App Service Plan, Backend App, Frontend App, Log Analytics |
| 4.1 | Login to ACR | Complete | N/A |
| 4.2 | Build backend Docker image | Complete | N/A |
| 4.3 | Push image to ACR | Complete | quizcrafter-backend:latest, quizcrafter-backend:4b72561 |
| 5.1 | Verify existing Key Vault secrets | Complete | N/A (9 secrets already present) |
| 5.2 | Grant Key Vault access to backend managed identity | Complete | Access policy added |
| 5.3 | Update Canvas redirect URI | Complete | N/A |
| 6.1 | Add WEBSITES_PORT setting | Complete | Fixed container startup issue |
| 6.2 | Build frontend with Azure API URL | Complete | N/A |
| 6.3 | Deploy frontend via zip deploy | Complete | RuntimeSuccessful |
| 7.1 | Database migrations | Skipped | Already applied (reusing p-qzcrft-test PostgreSQL) |

---

## Detailed Command Log

### 1.1 Prerequisites Verification

**Commands:**
```bash
az --version
docker --version
gh --version
node --version
```

**Results:**
| Tool | Status | Version |
|------|--------|---------|
| Azure CLI | Installed | 2.82.0 |
| Docker | Installed | 28.3.3 |
| GitHub CLI | Installed | 2.79.0 |
| Node.js | Installed | v20.19.2 |

---

### 1.2 Azure Login Verification

**Command:**
```bash
az account show --output json | jq '{name: .name, id: .id, state: .state, isDefault: .isDefault}'
```

**Output:**
```json
{
  "name": "p-qzcrft",
  "id": "f2d616a4-6e35-4999-aa17-22fa2c83dca5",
  "state": "Enabled",
  "isDefault": true
}
```

---

### 1.3 Resource Group Verification

**Command:**
```bash
az group show --name p-qzcrft-test-appservice --output table
```

**Output:**
```
Location    Name
----------  ------------------------
westeurope  p-qzcrft-test-appservice
```

---

### 1.4 Resource Provider Registration Status

**Command:**
```bash
az provider show --namespace Microsoft.Web --query "registrationState" -o tsv
az provider show --namespace Microsoft.ContainerRegistry --query "registrationState" -o tsv
az provider show --namespace Microsoft.DBforPostgreSQL --query "registrationState" -o tsv
az provider show --namespace Microsoft.KeyVault --query "registrationState" -o tsv
az provider show --namespace Microsoft.OperationalInsights --query "registrationState" -o tsv
```

**Results:**
| Provider | Registration State |
|----------|-------------------|
| Microsoft.Web | Registered |
| Microsoft.ContainerRegistry | Registered |
| Microsoft.DBforPostgreSQL | Registered |
| Microsoft.KeyVault | Registered |
| Microsoft.OperationalInsights | Registered |

---

### 2.1 Documentation Update

**File Modified:** `docs/azure-migration/APP_SERVICE_GUIDE.md`

**Change:** Replaced all occurrences of `p-qzcrft-test` with `p-qzcrft-test-appservice`

---

### 2.2 Initial Bicep Validation

**Command:**
```bash
az deployment group validate \
  --resource-group p-qzcrft-test-appservice \
  --template-file infrastructure/environments/test-appservice/main.bicep \
  --parameters postgresAdminPassword="TempValidation123!" \
               adminObjectId="67cab02b-a256-4a82-9d0a-f09e7c4d51ff"
```

**Output:**
```
WARNING: no-unnecessary-dependson warnings (3)
WARNING: outputs-should-not-contain-secrets (1)
```

**Status:** Validation passed (warnings only, no errors)

---

### 2.3 First Deployment Attempt (FAILED)

**Command:**
```bash
az deployment group create \
  --name "appservice-202601281425" \
  --resource-group p-qzcrft-test-appservice \
  --template-file infrastructure/environments/test-appservice/main.bicep \
  --parameters postgresAdminPassword="<password>" \
               adminObjectId="67cab02b-a256-4a82-9d0a-f09e7c4d51ff"
```

**Error Output:**
```json
{
  "status": "Failed",
  "error": {
    "code": "DeploymentFailed",
    "details": [
      {
        "code": "VaultAlreadyExists",
        "message": "The vault name 'qzcrft-test-kv' is already in use."
      },
      {
        "code": "Conflict",
        "message": "No available instances to satisfy this request. App Service is attempting to increase capacity."
      },
      {
        "code": "ServerNameAlreadyExists",
        "message": "Specified server name is already used by another server."
      },
      {
        "code": "AlreadyInUse",
        "message": "The registry DNS name qzcrfttestacr.azurecr.io is already in use."
      }
    ]
  }
}
```

**Root Cause:** Resources with same names already exist in `p-qzcrft-test` resource group (globally unique names required for Key Vault, PostgreSQL, Container Registry).

---

### 2.4 Check Existing Resources

**Command:**
```bash
az keyvault list --query "[?name=='qzcrft-test-kv'].{name:name, resourceGroup:resourceGroup}" -o table
az postgres flexible-server list --query "[?name=='qzcrft-test-db'].{name:name, resourceGroup:resourceGroup}" -o table
az acr list --query "[?name=='qzcrfttestacr'].{name:name, resourceGroup:resourceGroup}" -o table
```

**Output:**
```
Key Vault (active):
Name            ResourceGroup
--------------  ---------------
qzcrft-test-kv  p-qzcrft-test

PostgreSQL Server:
Name            ResourceGroup
--------------  ---------------
qzcrft-test-db  p-qzcrft-test

Container Registry:
Name           ResourceGroup
-------------  ---------------
qzcrfttestacr  p-qzcrft-test
```

**Decision:** Modify Bicep template to reuse existing resources from `p-qzcrft-test` instead of creating new ones.

---

### 2.5 Modified Bicep Template

**File Modified:** `infrastructure/environments/test-appservice/main.bicep`

**Changes Made:**
1. Removed Key Vault, PostgreSQL, and Container Registry module deployments
2. Added `existingResourceGroup` parameter (default: `p-qzcrft-test`)
3. Added cross-resource-group reference to existing Container Registry
4. Changed Log Analytics workspace name to `qzcrft-test-appservice-logs` (unique)
5. Changed App Service Plan name to `qzcrft-test-appservice-plan` (unique)
6. Removed `adminObjectId` and `postgresAdminPassword` parameters (no longer needed)

**New Template Structure:**
```
[REUSE] Key Vault from p-qzcrft-test
[REUSE] PostgreSQL Flexible Server from p-qzcrft-test
[REUSE] Container Registry from p-qzcrft-test
[NEW] Log Analytics workspace (qzcrft-test-appservice-logs)
[NEW] App Service Plan (qzcrft-test-appservice-plan)
[NEW] Backend App Service (qzcrft-test-api)
[NEW] Frontend App Service (qzcrft-test-web)
```

---

### 2.6 Second Deployment Attempt (FAILED)

**Command:**
```bash
az deployment group create \
  --name "appservice-202601281429" \
  --resource-group p-qzcrft-test-appservice \
  --template-file infrastructure/environments/test-appservice/main.bicep
```

**Error Output:**
```json
{
  "code": "Conflict",
  "message": "No available instances to satisfy this request. App Service is attempting to increase capacity. Please retry your request later."
}
```

**Root Cause:** West Europe region capacity constraints for B1 (Basic) App Service Plan tier.

---

### 2.7 Third Deployment Attempt (SUCCESS)

**Command:**
```bash
az deployment group create \
  --name "appservice-202601281435" \
  --resource-group p-qzcrft-test-appservice \
  --template-file infrastructure/environments/test-appservice/main.bicep \
  --parameters appServicePlanSku=S1 appServicePlanTier=Standard
```

**Status:** Succeeded

**Deployment Name:** appservice-202601281435
**Deployment Time:** 2026-01-28T13:37:33Z

---

### 2.8 Deployment Outputs

**Command:**
```bash
az deployment group show \
  --name "appservice-202601281435" \
  --resource-group p-qzcrft-test-appservice \
  --query properties.outputs -o json
```

**Output:**
```json
{
  "appServicePlanId": {
    "value": "/subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft-test-appservice/providers/Microsoft.Web/serverfarms/qzcrft-test-appservice-plan"
  },
  "appServicePlanName": {
    "value": "qzcrft-test-appservice-plan"
  },
  "backendAppName": {
    "value": "qzcrft-test-api"
  },
  "backendAppUrl": {
    "value": "https://qzcrft-test-api.azurewebsites.net"
  },
  "backendPrincipalId": {
    "value": "501a5d26-d843-4f89-b7df-7e15750ae93b"
  },
  "existingContainerRegistryLoginServer": {
    "value": "qzcrfttestacr.azurecr.io"
  },
  "existingKeyVaultName": {
    "value": "qzcrft-test-kv"
  },
  "existingPostgresServerFqdn": {
    "value": "qzcrft-test-db.postgres.database.azure.com"
  },
  "frontendAppName": {
    "value": "qzcrft-test-web"
  },
  "frontendAppUrl": {
    "value": "https://qzcrft-test-web.azurewebsites.net"
  },
  "logAnalyticsWorkspaceId": {
    "value": "/subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft-test-appservice/providers/Microsoft.OperationalInsights/workspaces/qzcrft-test-appservice-logs"
  },
  "logAnalyticsWorkspaceName": {
    "value": "qzcrft-test-appservice-logs"
  }
}
```

---

## Deployed Resources Summary

### New Resources (in p-qzcrft-test-appservice)

| Resource Type | Resource Name | SKU/Tier | Endpoint |
|---------------|---------------|----------|----------|
| App Service Plan | qzcrft-test-appservice-plan | S1 (Standard) | N/A |
| App Service (Backend) | qzcrft-test-api | (shared plan) | https://qzcrft-test-api.azurewebsites.net |
| App Service (Frontend) | qzcrft-test-web | (shared plan) | https://qzcrft-test-web.azurewebsites.net |
| Log Analytics | qzcrft-test-appservice-logs | PerGB2018 | N/A |

### Reused Resources (from p-qzcrft-test)

| Resource Type | Resource Name | Endpoint |
|---------------|---------------|----------|
| Key Vault | qzcrft-test-kv | https://qzcrft-test-kv.vault.azure.net/ |
| PostgreSQL | qzcrft-test-db | qzcrft-test-db.postgres.database.azure.com |
| Container Registry | qzcrfttestacr | qzcrfttestacr.azurecr.io |

### Backend App Service Configuration

| Property | Value |
|----------|-------|
| Name | qzcrft-test-api |
| URL | https://qzcrft-test-api.azurewebsites.net |
| Runtime | Docker container |
| Container Image | qzcrfttestacr.azurecr.io/quizcrafter-backend:latest |
| Health Check | /utils/health-check/ |
| Managed Identity | System-assigned (501a5d26-d843-4f89-b7df-7e15750ae93b) |
| Key Vault References | 9 secrets configured |

### Frontend App Service Configuration

| Property | Value |
|----------|-------|
| Name | qzcrft-test-web |
| URL | https://qzcrft-test-web.azurewebsites.net |
| Runtime | Node.js 20 LTS |
| Startup Command | pm2 serve /home/site/wwwroot --no-daemon --spa |
| VITE_API_URL | https://qzcrft-test-api.azurewebsites.net |

---

## Cost Estimate

| Resource | SKU | Est. Monthly Cost |
|----------|-----|-------------------|
| App Service Plan | S1 (Standard) | ~$73 |
| Log Analytics | Pay-per-GB | ~$5 |
| **New Resources Total** | | **~$78** |

**Note:** Key Vault, PostgreSQL, and Container Registry costs are already covered in the existing `p-qzcrft-test` deployment (~$32/month).

**Cost Optimization:** Scale down to B1 (Basic) tier when capacity becomes available:
```bash
az appservice plan update \
  --name qzcrft-test-appservice-plan \
  --resource-group p-qzcrft-test-appservice \
  --sku B1
```
This would reduce App Service Plan cost from ~$73 to ~$13/month.

---

## Phase 4: Container Registry Setup

### 4.1 ACR Login

**Command:**
```bash
az acr login --name qzcrfttestacr
```

**Output:**
```
Login Succeeded
```

---

### 4.2 Build Backend Docker Image

**Command:**
```bash
docker build --platform linux/amd64 \
  -t qzcrfttestacr.azurecr.io/quizcrafter-backend:latest \
  -t qzcrfttestacr.azurecr.io/quizcrafter-backend:4b72561 \
  ./backend
```

**Output:**
```
#15 [stage-0 9/9] RUN --mount=type=cache,target=/root/.cache/uv uv sync
#15 0.801  + quizcrafter-backend==0.1.0 (from file:///app)
#15 DONE 0.8s
#16 exporting to image
#16 naming to qzcrfttestacr.azurecr.io/quizcrafter-backend:latest done
#16 naming to qzcrfttestacr.azurecr.io/quizcrafter-backend:4b72561 done
```

**Status:** Build successful

---

### 4.3 Push Image to ACR

**Command:**
```bash
docker push qzcrfttestacr.azurecr.io/quizcrafter-backend --all-tags
```

**Output:**
```
4b72561: digest: sha256:54891a2b2660a357ee8fd54f51627ef102c0d090594750785b2c134b48a355f3 size: 856
latest: digest: sha256:54891a2b2660a357ee8fd54f51627ef102c0d090594750785b2c134b48a355f3 size: 856
```

---

### 4.4 Verify Image Tags

**Command:**
```bash
az acr repository show-tags --name qzcrfttestacr --repository quizcrafter-backend --output table
```

**Output:**
```
Result
--------
4b1d334
4b72561
latest
```

---

## Phase 5: Key Vault Configuration

### 5.1 Verify Existing Secrets

**Command:**
```bash
az keyvault secret list --vault-name qzcrft-test-kv --query "[].name" -o tsv
```

**Output:**
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

**Status:** All 9 required secrets already present

---

### 5.2 Grant Key Vault Access to Backend Managed Identity

**Command:**
```bash
az keyvault set-policy \
  --name qzcrft-test-kv \
  --object-id 501a5d26-d843-4f89-b7df-7e15750ae93b \
  --secret-permissions get list
```

**Output:**
```json
{
  "name": "qzcrft-test-kv",
  "properties": {
    "accessPolicies": [
      {
        "objectId": "501a5d26-d843-4f89-b7df-7e15750ae93b",
        "permissions": {
          "secrets": ["list", "get"]
        }
      }
    ],
    "provisioningState": "Succeeded"
  }
}
```

---

### 5.3 Update Canvas Redirect URI

**Command:**
```bash
az keyvault secret set --vault-name qzcrft-test-kv \
  --name "CANVAS-REDIRECT-URI" \
  --value "https://qzcrft-test-api.azurewebsites.net/auth/callback/canvas"
```

**Output:**
```json
{
  "name": "CANVAS-REDIRECT-URI",
  "version": "https://qzcrft-test-kv.vault.azure.net/secrets/CANVAS-REDIRECT-URI/8422218fde0349c4b0ebe0d50ec221e0"
}
```

---

## Phase 6: Frontend Deployment

### 6.1 Fix Backend Container Startup Issue

**Issue:** Backend container failed to start within 230 seconds.

**Root Cause:** Azure App Service didn't know which port the container listens on (FastAPI listens on 8000, Azure expects 80 by default).

**Command:**
```bash
az webapp config appsettings set \
  --name qzcrft-test-api \
  --resource-group p-qzcrft-test-appservice \
  --settings WEBSITES_PORT=8000
```

**Result:** Backend now responds correctly.

**Verification:**
```bash
curl https://qzcrft-test-api.azurewebsites.net/utils/health-check/
# Output: true
```

---

### 6.2 Build Frontend

**Command:**
```bash
cd frontend
npm ci
VITE_API_URL="https://qzcrft-test-api.azurewebsites.net" npm run build
```

**Output:**
```
vite v7.3.1 building client environment for production...
✓ 1776 modules transformed.
dist/index.html                    0.46 kB │ gzip:   0.29 kB
dist/assets/index-DOiDhs1A.js  1,325.70 kB │ gzip: 383.92 kB
✓ built in 2.27s
```

---

### 6.3 Deploy Frontend via Zip Deploy

**Commands:**
```bash
cd frontend/dist
zip -r ../frontend-dist.zip .

az webapp deployment source config-zip \
  --name qzcrft-test-web \
  --resource-group p-qzcrft-test-appservice \
  --src frontend-dist.zip
```

**Output:**
```json
{
  "properties": {
    "deploymentId": "b124a244-1d51-40a6-a913-1053f93340f9",
    "status": "RuntimeSuccessful",
    "numberOfInstancesSuccessful": 1
  }
}
```

**Verification:**
```bash
curl -s -o /dev/null -w "%{http_code}" https://qzcrft-test-web.azurewebsites.net
# Output: 200
```

---

## Phase 7: Database Migrations

### 7.1 Migration Status

**Status:** Skipped - Already Applied

**Reason:** The App Service deployment reuses the existing PostgreSQL database from `p-qzcrft-test` resource group. All 6 migrations were previously applied during the Container Apps deployment:

1. Initial migration
2. add_module_id_to_questions
3. add_quiz_sharing_tables
4. add_custom_instructions_to_quiz
5. add_rejection_feedback_fields
6. add_multiple_answer_to_questiontype_enum

**Verification:** API endpoints work correctly (OpenAPI spec loads, health check passes).

---

## Pending Steps

| Step | Description | Status |
|------|-------------|--------|
| 8 | Post-deployment validation | Pending |
| 9 | CI/CD workflow setup (optional) | Pending |

---

## Verification Commands

```bash
# List all resources in the new resource group
az resource list --resource-group p-qzcrft-test-appservice -o table

# Check backend App Service status
az webapp show --name qzcrft-test-api --resource-group p-qzcrft-test-appservice \
  --query "{state:state, hostNames:hostNames}"

# Check frontend App Service status
az webapp show --name qzcrft-test-web --resource-group p-qzcrft-test-appservice \
  --query "{state:state, hostNames:hostNames}"

# View backend logs
az webapp log tail --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# View frontend logs
az webapp log tail --name qzcrft-test-web --resource-group p-qzcrft-test-appservice
```

---

## Rollback Instructions

If you need to delete the App Service deployment:

```bash
# Delete individual resources
az webapp delete --name qzcrft-test-api --resource-group p-qzcrft-test-appservice
az webapp delete --name qzcrft-test-web --resource-group p-qzcrft-test-appservice
az appservice plan delete --name qzcrft-test-appservice-plan --resource-group p-qzcrft-test-appservice --yes
az monitor log-analytics workspace delete --workspace-name qzcrft-test-appservice-logs --resource-group p-qzcrft-test-appservice --yes

# Or delete the entire resource group
az group delete --name p-qzcrft-test-appservice --yes
```

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-28 | Claude Code | Initial document creation |
| 2026-01-28 | Claude Code | Phase 3 complete - Infrastructure deployed with S1 tier |
| 2026-01-28 | Claude Code | Phase 4 complete - Backend image built and pushed to ACR |
| 2026-01-28 | Claude Code | Phase 5 complete - Key Vault access granted, redirect URI updated |
| 2026-01-28 | Claude Code | Phase 6 complete - Fixed WEBSITES_PORT, frontend deployed via zip deploy |
| 2026-01-28 | Claude Code | Phase 7 skipped - Database migrations already applied from Container Apps deployment |
