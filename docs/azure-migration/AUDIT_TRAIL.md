# Azure Migration Audit Trail

**Migration Started:** 2026-01-27
**Performed By:** Claude Code (assisted)
**Azure Account:** mso270@uit.no
**Subscription:** p-qzcrft (f2d616a4-6e35-4999-aa17-22fa2c83dca5)

---

## Summary of Actions Taken

| Step | Action | Status | Azure Resource Created |
|------|--------|--------|------------------------|
| 1.1 | Verified prerequisites | Complete | N/A |
| 1.2 | Verified Azure login | Complete | N/A |
| 1.3 | Verified resource group | Complete | N/A (pre-existing) |
| 1.4 | Registered resource providers | Complete | N/A |
| 1.5 | Created Microsoft Entra app | Complete | App Registration |
| 1.6 | Created service principal | Complete | Enterprise Application |
| 1.7 | Added federated credentials | Complete | Federated Identity Credentials |
| 1.8 | Assigned Contributor role | Pending | For GitHub Actions CI/CD |
| 2.1 | Created Bicep infrastructure files | Complete | N/A |
| 2.2 | Deployed infrastructure | Complete | Log Analytics, Key Vault, PostgreSQL, ACR, Container Apps Env, Static Web App |
| 3.1 | Built and pushed Docker image | Complete | qzcrfttestacr.azurecr.io/quizcrafter-backend:latest |
| 5.1 | Added secrets to Key Vault | Complete | 8 secrets configured |
| 6.1 | Created Container App | Complete | qzcrft-test-backend |
| 6.2 | Configured Key Vault access | Complete | Managed identity access policy |
| 6.3 | Added CANVAS-REDIRECT-URI | Complete | 9 secrets total |
| 6.4 | Configured env vars with secrets | Complete | All secrets linked |
| 6.5 | Verified health check | Complete | Backend running |
| 7.1 | Deployed frontend to SWA | Complete | `https://delightful-coast-07e03b203.2.azurestaticapps.net` |

---

## Detailed Command Log

### 1.1 Prerequisites Verification

**Commands:**
```bash
az --version
gh --version
docker --version
psql --version
jq --version
```

**Results:**
| Tool | Status | Version |
|------|--------|---------|
| Azure CLI | Installed | (verified) |
| GitHub CLI | Installed | 2.79.0 |
| Docker | Installed | 28.3.3 |
| PostgreSQL client | **NOT INSTALLED** | - |
| jq | Installed | 1.8.1 |

**Action Required:** Install PostgreSQL client before database migration phase:
```bash
brew install libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

### 1.2 Azure Login Verification

**Command:**
```bash
az account show --output table
```

**Output:**
```
EnvironmentName    HomeTenantId                          IsDefault    Name      State    TenantDefaultDomain                   TenantDisplayName    TenantId
-----------------  ------------------------------------  -----------  --------  -------  ------------------------------------  -------------------  ------------------------------------
AzureCloud         4e7f212d-74db-4563-a57b-8ae44ed05526  True         p-qzcrft  Enabled  UniversitetetiTromso.onmicrosoft.com  UiT Office 365       4e7f212d-74db-4563-a57b-8ae44ed05526
```

**Audit:** Verify with `az account show`

---

### 1.3 Resource Group Verification

**Command:**
```bash
az group show --name "p-qzcrft-test" --output table
```

**Output:**
```
Location    Name
----------  -------------
westeurope  p-qzcrft-test
```

**Audit:** Verify with `az group show --name p-qzcrft-test`

---

### 1.4 Resource Provider Registration

**Commands:**
```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.Web
```

**Results:**
| Provider | Registration State |
|----------|-------------------|
| Microsoft.App | Registered |
| Microsoft.ContainerRegistry | Registered |
| Microsoft.DBforPostgreSQL | Registered |
| Microsoft.KeyVault | Registered |
| Microsoft.OperationalInsights | Registered |
| Microsoft.Web | Registered |

**Audit:** Verify each provider:
```bash
az provider show --namespace Microsoft.App --query "registrationState" -o tsv
az provider show --namespace Microsoft.ContainerRegistry --query "registrationState" -o tsv
az provider show --namespace Microsoft.DBforPostgreSQL --query "registrationState" -o tsv
az provider show --namespace Microsoft.KeyVault --query "registrationState" -o tsv
az provider show --namespace Microsoft.OperationalInsights --query "registrationState" -o tsv
az provider show --namespace Microsoft.Web --query "registrationState" -o tsv
```

---

### 1.5 Microsoft Entra Application Creation

**Command:**
```bash
APP_NAME="quizcrafter-github-oidc"
az ad app create --display-name $APP_NAME --output table
```

**Output:**
```
@odata.context                                                   AppId                                 CreatedDateTime               DisplayName              PublisherDomain                       SignInAudience
---------------------------------------------------------------  ------------------------------------  ----------------------------  -----------------------  ------------------------------------  ----------------
https://graph.microsoft.com/v1.0/$metadata#applications/$entity  c5f4539b-188a-4ae0-bc0c-15dc59eb95d0  2026-01-27T11:21:16.2449048Z  quizcrafter-github-oidc  UniversitetetiTromso.onmicrosoft.com  AzureADMyOrg
```

**Created Resource:**
- **Type:** Microsoft Entra App Registration
- **Display Name:** quizcrafter-github-oidc
- **Application (Client) ID:** c5f4539b-188a-4ae0-bc0c-15dc59eb95d0
- **Created:** 2026-01-27T11:21:16Z

**Audit:** Verify in Azure Portal or CLI:
```bash
az ad app list --display-name "quizcrafter-github-oidc" --output table
```

Or in Azure Portal: **Microsoft Entra ID > App registrations > quizcrafter-github-oidc**

---

### 1.6 Service Principal Creation

**Command:**
```bash
APP_ID=$(az ad app list --display-name "quizcrafter-github-oidc" --query "[0].appId" -o tsv)
az ad sp create --id $APP_ID --output table
```

**Output:**
```
@odata.context                                                        AccountEnabled    AppDisplayName           AppId                                 AppOwnerOrganizationId                AppRoleAssignmentRequired    DisplayName              ServicePrincipalType    SignInAudience
--------------------------------------------------------------------  ----------------  -----------------------  ------------------------------------  ------------------------------------  ---------------------------  -----------------------  ----------------------  ----------------
https://graph.microsoft.com/v1.0/$metadata#servicePrincipals/$entity  True              quizcrafter-github-oidc  c5f4539b-188a-4ae0-bc0c-15dc59eb95d0  4e7f212d-74db-4563-a57b-8ae44ed05526  False                        quizcrafter-github-oidc  Application             AzureADMyOrg
```

**Created Resource:**
- **Type:** Enterprise Application (Service Principal)
- **Display Name:** quizcrafter-github-oidc
- **Object ID:** 2959dc97-b637-4696-9e87-82662a7dd4cb
- **App ID:** c5f4539b-188a-4ae0-bc0c-15dc59eb95d0

**Audit:** Verify in Azure Portal or CLI:
```bash
az ad sp list --display-name "quizcrafter-github-oidc" --output table
```

Or in Azure Portal: **Microsoft Entra ID > Enterprise applications > quizcrafter-github-oidc**

---

### 1.7 Federated Identity Credentials

#### 1.7.1 Main Branch Credential

**Command:**
```bash
APP_ID=$(az ad app list --display-name "quizcrafter-github-oidc" --query "[0].appId" -o tsv)
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:solarmarius/quizcrafter:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

**Output:**
```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#applications('c05c18bd-ba95-4c1d-8fa5-8af2eb53b788')/federatedIdentityCredentials/$entity",
  "audiences": ["api://AzureADTokenExchange"],
  "description": null,
  "id": "541acae8-165c-43a5-8671-96c55d7a3bbb",
  "issuer": "https://token.actions.githubusercontent.com",
  "name": "github-main",
  "subject": "repo:solarmarius/quizcrafter:ref:refs/heads/main"
}
```

**Created Resource:**
- **Type:** Federated Identity Credential
- **Name:** github-main
- **ID:** 541acae8-165c-43a5-8671-96c55d7a3bbb
- **Subject:** repo:solarmarius/quizcrafter:ref:refs/heads/main
- **Purpose:** Allows GitHub Actions workflows running on the `main` branch to authenticate

#### 1.7.2 Pull Request Credential

**Command:**
```bash
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "github-pr",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:solarmarius/quizcrafter:pull_request",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

**Output:**
```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#applications('c05c18bd-ba95-4c1d-8fa5-8af2eb53b788')/federatedIdentityCredentials/$entity",
  "audiences": ["api://AzureADTokenExchange"],
  "description": null,
  "id": "3cde15db-c82c-42f8-92c2-04c857bcece6",
  "issuer": "https://token.actions.githubusercontent.com",
  "name": "github-pr",
  "subject": "repo:solarmarius/quizcrafter:pull_request"
}
```

**Created Resource:**
- **Type:** Federated Identity Credential
- **Name:** github-pr
- **ID:** 3cde15db-c82c-42f8-92c2-04c857bcece6
- **Subject:** repo:solarmarius/quizcrafter:pull_request
- **Purpose:** Allows GitHub Actions workflows running on pull requests to authenticate

**Audit:** Verify federated credentials:
```bash
APP_ID=$(az ad app list --display-name "quizcrafter-github-oidc" --query "[0].appId" -o tsv)
az ad app federated-credential list --id $APP_ID --output table
```

Or in Azure Portal: **Microsoft Entra ID > App registrations > quizcrafter-github-oidc > Certificates & secrets > Federated credentials**

---

### 1.8 Role Assignment (BLOCKED)

**Attempted Command:**
```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SP_OBJECT_ID=$(az ad sp list --display-name "quizcrafter-github-oidc" --query "[0].id" -o tsv)

az role assignment create \
  --role Contributor \
  --assignee-object-id $SP_OBJECT_ID \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/p-qzcrft-test
```

**Error:**
```
ERROR: (AuthorizationFailed) The client 'mso270@uit.no' with object id '67cab02b-a256-4a82-9d0a-f09e7c4d51ff' does not have authorization to perform action 'Microsoft.Authorization/roleAssignments/write' over scope '/subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft-test/providers/Microsoft.Authorization/roleAssignments/e41b9dc0-2d0e-4a2e-adbd-3cc315755709' or the scope is invalid.
```

**Status:** BLOCKED - Requires Azure admin with Owner or User Access Administrator role

**Action Required:** An Azure administrator must run:
```bash
az role assignment create \
  --role Contributor \
  --assignee-object-id 2959dc97-b637-4696-9e87-82662a7dd4cb \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft-test
```

Or via Azure Portal:
1. Navigate to **p-qzcrft-test** resource group
2. Click **Access control (IAM)**
3. Click **Add > Add role assignment**
4. Select **Contributor** role
5. Search for **quizcrafter-github-oidc** and select it
6. Click **Review + assign**

---

## GitHub Secrets to Configure

These secrets need to be added to GitHub repository settings:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `AZURE_CLIENT_ID` | `c5f4539b-188a-4ae0-bc0c-15dc59eb95d0` | Microsoft Entra Application ID |
| `AZURE_TENANT_ID` | `4e7f212d-74db-4563-a57b-8ae44ed05526` | Azure AD Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | `f2d616a4-6e35-4999-aa17-22fa2c83dca5` | Azure Subscription ID |

**Location:** GitHub > Repository Settings > Secrets and variables > Actions > New repository secret

---

## Azure Resources Created Summary

| Resource Type | Name | ID/Object ID | Location |
|---------------|------|--------------|----------|
| App Registration | quizcrafter-github-oidc | c5f4539b-188a-4ae0-bc0c-15dc59eb95d0 | Microsoft Entra ID |
| Service Principal | quizcrafter-github-oidc | 2959dc97-b637-4696-9e87-82662a7dd4cb | Microsoft Entra ID |
| Federated Credential | github-main | 541acae8-165c-43a5-8671-96c55d7a3bbb | App Registration |
| Federated Credential | github-pr | 3cde15db-c82c-42f8-92c2-04c857bcece6 | App Registration |

---

## Verification Commands

Run these commands to verify all resources were created correctly:

```bash
# 1. Verify App Registration exists
az ad app list --display-name "quizcrafter-github-oidc" --query "[].{Name:displayName, AppId:appId}" -o table

# 2. Verify Service Principal exists
az ad sp list --display-name "quizcrafter-github-oidc" --query "[].{Name:displayName, ObjectId:id, AppId:appId}" -o table

# 3. Verify Federated Credentials
APP_ID=$(az ad app list --display-name "quizcrafter-github-oidc" --query "[0].appId" -o tsv)
az ad app federated-credential list --id $APP_ID --query "[].{Name:name, Subject:subject}" -o table

# 4. Check if role assignment exists (after admin completes it)
az role assignment list \
  --scope /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft-test \
  --query "[?principalName=='quizcrafter-github-oidc'].{Role:roleDefinitionName, Principal:principalName}" -o table
```

---

## Rollback Instructions

If you need to undo the changes made:

```bash
# 1. Delete the App Registration (this also deletes the service principal and federated credentials)
APP_ID=$(az ad app list --display-name "quizcrafter-github-oidc" --query "[0].appId" -o tsv)
az ad app delete --id $APP_ID

# 2. Remove role assignment (if it was created)
az role assignment delete \
  --assignee 2959dc97-b637-4696-9e87-82662a7dd4cb \
  --role Contributor \
  --scope /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft-test
```

---

---

## Phase 2: Infrastructure as Code (Bicep)

### 2.1 Created Infrastructure Directory Structure

**Files Created:**

| File | Purpose |
|------|---------|
| `infrastructure/modules/log-analytics.bicep` | Log Analytics workspace module |
| `infrastructure/modules/key-vault.bicep` | Azure Key Vault module |
| `infrastructure/modules/postgresql.bicep` | PostgreSQL Flexible Server module |
| `infrastructure/modules/container-registry.bicep` | Azure Container Registry module |
| `infrastructure/modules/container-apps-env.bicep` | Container Apps Environment module |
| `infrastructure/modules/container-app.bicep` | Container App (backend) module |
| `infrastructure/modules/static-web-app.bicep` | Static Web App (frontend) module |
| `infrastructure/environments/test/main.bicep` | Test environment main deployment |
| `infrastructure/environments/test/parameters.json` | Test environment parameters template |
| `infrastructure/README.md` | Infrastructure documentation |

### 2.2 Resources Defined in Test Environment

| Resource Type | Name Pattern | SKU/Tier |
|---------------|-------------|----------|
| Log Analytics | qzcrft-test-logs | PerGB2018 |
| Key Vault | qzcrft-test-kv | Standard |
| PostgreSQL | qzcrft-test-db | Standard_B1ms (Burstable) |
| Container Registry | qzcfttestacr | Basic |
| Container Apps Env | qzcrft-test-env | Consumption |
| Static Web App | qzcrft-test-frontend | Free |

### 2.3 Infrastructure Deployment

**Deployment Name:** quizcrafter-test-202601271318
**Deployment Time:** 2026-01-27T12:21:17Z
**Duration:** ~2 minutes
**Status:** Succeeded

**Command Used:**
```bash
POSTGRES_PASSWORD=$(openssl rand -base64 24)
az deployment group create \
  --name "quizcrafter-test-$(date +%Y%m%d%H%M)" \
  --resource-group p-qzcrft-test \
  --template-file infrastructure/environments/test/main.bicep \
  --parameters postgresAdminPassword="$POSTGRES_PASSWORD" adminObjectId="$(az ad signed-in-user show --query id -o tsv)"
```

**Issues Encountered & Fixes:**
1. **PgBouncer not supported on Burstable tier** - Fixed by adding conditional to only enable PgBouncer on non-Burstable SKUs
2. **Key Vault enablePurgeProtection error** - Fixed by removing explicit `enablePurgeProtection: false` (Azure doesn't allow setting it explicitly to false)

### 2.4 Deployed Resources

| Resource Type | Resource Name | Endpoint/Details |
|---------------|---------------|------------------|
| Log Analytics | qzcrft-test-logs | Workspace ID: /subscriptions/f2d616a4-6e35-4999-aa17-22fa2c83dca5/resourceGroups/p-qzcrft-test/providers/Microsoft.OperationalInsights/workspaces/qzcrft-test-logs |
| Key Vault | qzcrft-test-kv | `https://qzcrft-test-kv.vault.azure.net/` |
| PostgreSQL | qzcrft-test-db | `qzcrft-test-db.postgres.database.azure.com` |
| PostgreSQL Database | quizcrafter | Database name within qzcrft-test-db |
| Container Registry | qzcrfttestacr | `qzcrfttestacr.azurecr.io` |
| Container Apps Environment | qzcrft-test-env | Default domain: `icycliff-e1332370.westeurope.azurecontainerapps.io` |
| Static Web App | qzcrft-test-frontend | `https://delightful-coast-07e03b203.2.azurestaticapps.net` |

**Verification Command:**
```bash
az resource list --resource-group p-qzcrft-test -o table
```

**PostgreSQL Connection Details:**
- **Server:** qzcrft-test-db.postgres.database.azure.com
- **Port:** 5432
- **Database:** quizcrafter
- **Admin User:** quizcrafteradmin
- **Password:** Stored in environment variable `$POSTGRES_PASSWORD` (user must have saved this)
- **SSL Mode:** require

---

## Phase 3: Container Registry Setup

### 3.1 ACR Login

**Command:**
```bash
az acr login --name qzcrfttestacr
```

### 3.2 Build and Push Backend Image

**Commands:**
```bash
docker build -t qzcrfttestacr.azurecr.io/quizcrafter-backend:latest ./backend
docker push qzcrfttestacr.azurecr.io/quizcrafter-backend:latest

COMMIT_SHA=$(git rev-parse --short HEAD)
docker tag qzcrfttestacr.azurecr.io/quizcrafter-backend:latest qzcrfttestacr.azurecr.io/quizcrafter-backend:$COMMIT_SHA
docker push qzcrfttestacr.azurecr.io/quizcrafter-backend:$COMMIT_SHA
```

**Result:**
- Image pushed with tags: `latest`, `4b1d334`
- Digest: `sha256:5e8435440864e71b6909e601afd219dc4e174957b63b562bc7581c216d662665`

**Verification:**
```bash
az acr repository show-tags --name qzcrfttestacr --repository quizcrafter-backend -o table
```

---

## Phase 5: Key Vault Configuration

### 5.1 Secrets Added

| Secret Name | Purpose | Added |
|-------------|---------|-------|
| SECRET-KEY | Application secret key | Yes |
| POSTGRES-PASSWORD | Database password | Yes |
| CANVAS-CLIENT-ID | Canvas OAuth client ID | Yes |
| CANVAS-CLIENT-SECRET | Canvas OAuth client secret | Yes |
| CANVAS-BASE-URL | Canvas LMS base URL | Yes |
| AZURE-OPENAI-API-KEY | Azure OpenAI API key | Yes |
| AZURE-OPENAI-ENDPOINT | Azure OpenAI endpoint | Yes |
| AZURE-OPENAI-API-VERSION | Azure OpenAI API version | Yes |

**Verification:**
```bash
az keyvault secret list --vault-name qzcrft-test-kv --query "[].name" -o tsv
```

**Note:** CANVAS-REDIRECT-URI will be added after Container App deployment (need backend URL first).

---

## Phase 6: Container Apps Deployment

### 6.1 Initial Container App Creation

**Issue:** First attempt failed due to wrong platform architecture (ARM64 instead of linux/amd64).

**Fix:**
```bash
docker build --platform linux/amd64 -t qzcrfttestacr.azurecr.io/quizcrafter-backend:latest ./backend
docker push qzcrfttestacr.azurecr.io/quizcrafter-backend:latest
```

**Command (successful):**
```bash
az containerapp create \
  --name qzcrft-test-backend \
  --resource-group p-qzcrft-test \
  --environment qzcrft-test-env \
  --image qzcrfttestacr.azurecr.io/quizcrafter-backend:latest \
  --registry-server qzcrfttestacr.azurecr.io \
  --registry-username $(az acr credential show --name qzcrfttestacr --query username -o tsv) \
  --registry-password $(az acr credential show --name qzcrfttestacr --query "passwords[0].value" -o tsv) \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 4 \
  --cpu 0.5 \
  --memory 1Gi \
  --system-assigned \
  --env-vars \
    POSTGRES_SERVER=qzcrft-test-db.postgres.database.azure.com \
    POSTGRES_PORT=5432 \
    POSTGRES_DB=quizcrafter \
    POSTGRES_USER=quizcrafteradmin \
    ENVIRONMENT=production \
    PROJECT_NAME=QuizCrafter
```

**Created Resource:**
- **Container App:** qzcrft-test-backend
- **URL:** `https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io/`
- **Managed Identity Principal ID:** bffa6778-c5e7-40f8-8d65-4a17fc1dfc28

### 6.2 Key Vault Access Policy

**Command:**
```bash
az keyvault set-policy --name qzcrft-test-kv --object-id bffa6778-c5e7-40f8-8d65-4a17fc1dfc28 --secret-permissions get list
```

### 6.3 Added CANVAS-REDIRECT-URI Secret

**Command:**
```bash
az keyvault secret set --vault-name qzcrft-test-kv --name CANVAS-REDIRECT-URI --value "https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io/api/auth/canvas/callback"
```

### 6.4 Configured Key Vault Secret References

**Step 1: Add secrets with Key Vault references:**
```bash
az containerapp secret set --name qzcrft-test-backend --resource-group p-qzcrft-test --secrets \
  "secret-key=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/SECRET-KEY,identityref:system" \
  "postgres-password=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/POSTGRES-PASSWORD,identityref:system" \
  "canvas-client-id=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/CANVAS-CLIENT-ID,identityref:system" \
  "canvas-client-secret=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/CANVAS-CLIENT-SECRET,identityref:system" \
  "canvas-base-url=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/CANVAS-BASE-URL,identityref:system" \
  "canvas-redirect-uri=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/CANVAS-REDIRECT-URI,identityref:system" \
  "azure-openai-api-key=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/AZURE-OPENAI-API-KEY,identityref:system" \
  "azure-openai-endpoint=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/AZURE-OPENAI-ENDPOINT,identityref:system" \
  "azure-openai-api-version=keyvaultref:https://qzcrft-test-kv.vault.azure.net/secrets/AZURE-OPENAI-API-VERSION,identityref:system"
```

**Step 2: Update environment variables:**
```bash
az containerapp update --name qzcrft-test-backend --resource-group p-qzcrft-test --set-env-vars \
  "POSTGRES_SERVER=qzcrft-test-db.postgres.database.azure.com" \
  "POSTGRES_PORT=5432" \
  "POSTGRES_DB=quizcrafter" \
  "POSTGRES_USER=quizcrafteradmin" \
  "ENVIRONMENT=production" \
  "PROJECT_NAME=QuizCrafter" \
  "FRONTEND_HOST=https://delightful-coast-07e03b203.2.azurestaticapps.net" \
  "SECRET_KEY=secretref:secret-key" \
  "POSTGRES_PASSWORD=secretref:postgres-password" \
  "CANVAS_CLIENT_ID=secretref:canvas-client-id" \
  "CANVAS_CLIENT_SECRET=secretref:canvas-client-secret" \
  "CANVAS_BASE_URL=secretref:canvas-base-url" \
  "CANVAS_REDIRECT_URI=secretref:canvas-redirect-uri" \
  "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key" \
  "AZURE_OPENAI_ENDPOINT=secretref:azure-openai-endpoint" \
  "AZURE_OPENAI_API_VERSION=secretref:azure-openai-api-version"
```

### 6.5 Health Check Verification

**Command:**
```bash
curl https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io/api/utils/health-check/
```

**Result:** Success - Backend is running and healthy.

**Container App Details:**
| Property | Value |
|----------|-------|
| Name | qzcrft-test-backend |
| URL | `https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io/` |
| CPU | 0.5 |
| Memory | 1Gi |
| Min Replicas | 0 |
| Max Replicas | 4 |
| Managed Identity | System-assigned (bffa6778-c5e7-40f8-8d65-4a17fc1dfc28) |

---

## Phase 7: Static Web Apps (Frontend)

### 7.1 Frontend Deployment

**Commands:**
```bash
SWA_TOKEN=$(az staticwebapp secrets list --name qzcrft-test-frontend --resource-group p-qzcrft-test --query properties.apiKey -o tsv)
cd frontend
npm ci
VITE_API_URL="https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io" npm run build
npx @azure/static-web-apps-cli deploy ./dist --deployment-token $SWA_TOKEN --env production
```

**Result:** Success

**Static Web App Details:**

| Property | Value |
|----------|-------|
| Name | qzcrft-test-frontend |
| URL | `https://delightful-coast-07e03b203.2.azurestaticapps.net` |
| Backend API URL | `https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io` |

---

## Phase 8: Post-Deployment Fixes

### 8.1 Canvas OAuth Secrets Update

**Date:** 2026-01-28

**Issue:** Canvas OAuth credentials needed to be updated for the new Azure deployment.

**Commands:**
```bash
az keyvault secret set --vault-name qzcrft-test-kv --name CANVAS-CLIENT-ID --value "<new-client-id>"
az keyvault secret set --vault-name qzcrft-test-kv --name CANVAS-CLIENT-SECRET --value "<new-client-secret>"
az containerapp revision restart --name qzcrft-test-backend --resource-group p-qzcrft-test --revision $(az containerapp revision list --name qzcrft-test-backend --resource-group p-qzcrft-test --query "[0].name" -o tsv)
```

**Result:** Secrets updated successfully.

### 8.2 CANVAS-REDIRECT-URI Path Correction

**Issue:** The original redirect URI had incorrect path format.

**Original (incorrect):**

```text
https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io/api/auth/canvas/callback
```

**Corrected:**

```text
https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io/auth/callback/canvas
```

**Command:**
```bash
az keyvault secret set --vault-name qzcrft-test-kv --name CANVAS-REDIRECT-URI --value "https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io/auth/callback/canvas"
```

**Note:** The Canvas Developer Key also needed to be updated with the correct redirect URI.

### 8.3 Database Migration

**Issue:** Database tables did not exist - migrations were never run on Azure PostgreSQL.

**Error:**

```sql
relation "user" does not exist
```

**Solution:** Exec into the running container and run Alembic migrations.

**Commands:**
```bash
# Exec into the container
az containerapp exec --name qzcrft-test-backend --resource-group p-qzcrft-test --command /bin/bash

# Inside the container, run migrations
alembic upgrade head
```

**Result:** All 6 migrations applied successfully:

- Initial migration
- add_module_id_to_questions
- add_quiz_sharing_tables
- add_custom_instructions_to_quiz
- add_rejection_feedback_fields
- add_multiple_answer_to_questiontype_enum

### 8.4 Frontend SPA Routing Fix

**Issue:** After Canvas OAuth callback, frontend returned 404 for `/login/success` route.

**Root Cause:** Azure Static Web Apps requires `staticwebapp.config.json` for SPA fallback routing.

**Solution:** Created `frontend/staticwebapp.config.json`:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.ico", "/*.png", "/*.svg", "/*.jpg", "/*.jpeg", "/*.gif", "/*.webp"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  },
  "platform": {
    "apiRuntime": "node:18"
  }
}
```

### 8.5 Frontend API URL Configuration

**Issue:** Frontend was redirecting to `localhost:8000` instead of Azure backend URL.

**Root Cause:** The `.env` file contained `VITE_API_URL=http://localhost:8000` and no production override existed.

**Solution:** Created `frontend/.env.production`:

```text
VITE_API_URL=https://qzcrft-test-backend.icycliff-e1332370.westeurope.azurecontainerapps.io
```

**Redeployment Commands:**
```bash
cd frontend
npm run build
SWA_TOKEN=$(az staticwebapp secrets list --name qzcrft-test-frontend --resource-group p-qzcrft-test --query properties.apiKey -o tsv)
npx @azure/static-web-apps-cli deploy ./dist --deployment-token $SWA_TOKEN --env production
```

**Result:** Frontend now correctly points to Azure backend.

### 8.6 Useful Debugging Commands

**View backend logs:**

```bash
# Recent logs
az containerapp logs show --name qzcrft-test-backend --resource-group p-qzcrft-test --tail 100

# Stream live logs
az containerapp logs show --name qzcrft-test-backend --resource-group p-qzcrft-test --follow

# System logs (container events)
az containerapp logs show --name qzcrft-test-backend --resource-group p-qzcrft-test --type system
```

**Check container status:**

```bash
az containerapp show --name qzcrft-test-backend --resource-group p-qzcrft-test --query "{status:properties.runningStatus, latestRevision:properties.latestRevisionName}" -o table
```

---

## Next Steps

1. **[COMPLETE]** Create Bicep infrastructure files
2. **[COMPLETE]** Deploy infrastructure to test resource group
3. **[COMPLETE]** Phase 3: Build and push Docker image to Container Registry
4. **[COMPLETE]** Phase 4: Database Migration
5. **[COMPLETE]** Phase 5: Add secrets to Key Vault
6. **[COMPLETE]** Phase 6: Deploy backend Container App
7. **[COMPLETE]** Phase 7: Deploy frontend to Static Web App
8. **[COMPLETE]** Phase 8: Post-deployment fixes (OAuth, migrations, SPA routing)
9. **[PENDING]** Phase 9: Add GitHub secrets for CI/CD
10. **[PENDING]** Phase 9: Get Azure admin to assign Contributor role (for GitHub Actions)
11. **[PENDING]** Phase 10: Monitoring setup

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-27 | Claude Code | Initial document creation |
| 2026-01-27 | Claude Code | Updated AZURE_MIGRATION_GUIDE.md and QUICK_REFERENCE.md to use OIDC instead of service principal secrets |
| 2026-01-27 | Claude Code | Created Bicep infrastructure files (Phase 2) |
| 2026-01-27 | Claude Code | Successfully deployed infrastructure to p-qzcrft-test (Phase 2 complete) |
| 2026-01-27 | Claude Code | Built and pushed Docker image to ACR (Phase 3 complete) |
| 2026-01-27 | Claude Code | Added secrets to Key Vault (Phase 5 complete) |
| 2026-01-27 | Claude Code | Deployed backend Container App with Key Vault integration (Phase 6 complete) |
| 2026-01-27 | Claude Code | Deployed frontend to Static Web App (Phase 7 complete) |
| 2026-01-28 | Claude Code | Phase 8: Fixed Canvas OAuth secrets, redirect URI path, database migrations, SPA routing, and frontend API URL |
