# QuizCrafter Azure App Service Migration Guide

This guide provides comprehensive instructions for deploying QuizCrafter to Azure using **Azure App Service** instead of Container Apps + Static Web Apps.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Azure Services Summary](#azure-services-summary)
4. [Phase 1: Azure Foundation Setup](#phase-1-azure-foundation-setup)
5. [Phase 2: Infrastructure as Code (Bicep)](#phase-2-infrastructure-as-code-bicep)
6. [Phase 3: Deploy Infrastructure](#phase-3-deploy-infrastructure)
7. [Phase 4: Container Registry Setup](#phase-4-container-registry-setup)
8. [Phase 5: Key Vault Configuration](#phase-5-key-vault-configuration)
9. [Phase 6: Backend App Service Deployment](#phase-6-backend-app-service-deployment)
10. [Phase 7: Frontend App Service Deployment](#phase-7-frontend-app-service-deployment)
11. [Phase 8: Database Migration](#phase-8-database-migration)
12. [Phase 9: Custom Domains and SSL](#phase-9-custom-domains-and-ssl)
13. [Phase 10: CI/CD Pipeline Setup](#phase-10-cicd-pipeline-setup)
14. [Phase 11: Monitoring and Observability](#phase-11-monitoring-and-observability)
15. [Post-Deployment Validation](#post-deployment-validation)
16. [Troubleshooting](#troubleshooting)
17. [Cost Management](#cost-management)
18. [Comparison: App Service vs Container Apps](#comparison-app-service-vs-container-apps)

---

## Architecture Overview

### Target Architecture (Two App Services)

```
                         Azure Cloud (p-qzcrft-test-appservice)
    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │              App Service Plan (Linux, B1)                  │  │
    │  │                                                            │  │
    │  │  ┌─────────────────────┐    ┌─────────────────────┐       │  │
    │  │  │  Backend App        │    │  Frontend App       │       │  │
    │  │  │  qzcrft-test-api    │    │  qzcrft-test-web    │       │  │
    │  │  │                     │    │                     │       │  │
    │  │  │  • Python 3.10      │    │  • Node.js 20       │       │  │
    │  │  │  • FastAPI          │    │  • PM2 serve        │       │  │
    │  │  │  • Container deploy │    │  • Static files     │       │  │
    │  │  │  • Port 8000        │    │  • SPA routing      │       │  │
    │  │  └─────────────────────┘    └─────────────────────┘       │  │
    │  │            │                          │                    │  │
    │  └────────────┼──────────────────────────┼────────────────────┘  │
    │               │                          │                       │
    │               │     ┌────────────────────┘                       │
    │               │     │                                            │
    │               ▼     ▼                                            │
    │  ┌─────────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
    │  │   PostgreSQL        │  │   Key Vault     │  │  Container   │ │
    │  │   Flexible Server   │  │   qzcrft-       │  │  Registry    │ │
    │  │   qzcrft-test-db    │  │   test-kv       │  │  qzcrfttestacr│ │
    │  │                     │  │                 │  │              │ │
    │  │   • Burstable B1ms  │  │   • Secrets     │  │  • Backend   │ │
    │  │   • 32GB storage    │  │   • Canvas creds│  │    images    │ │
    │  │   • SSL required    │  │   • API keys    │  │              │ │
    │  └─────────────────────┘  └─────────────────┘  └──────────────┘ │
    │                                                                  │
    │  ┌─────────────────────┐                                        │
    │  │   Log Analytics     │                                        │
    │  │   qzcrft-test-logs  │                                        │
    │  │                     │                                        │
    │  │   • App logs        │                                        │
    │  │   • Metrics         │                                        │
    │  │   • Diagnostics     │                                        │
    │  └─────────────────────┘                                        │
    │                                                                  │
    │  External Services: Canvas LMS (OAuth), Azure OpenAI            │
    └──────────────────────────────────────────────────────────────────┘
```

### Why Two App Services?

| Benefit | Description |
|---------|-------------|
| **Independent Scaling** | Scale frontend and backend separately based on load |
| **Technology Isolation** | Optimal runtime for each (Python vs Node.js) |
| **Cleaner Deployment** | Separate CI/CD pipelines, easier rollbacks |
| **Better Debugging** | Isolated logs and metrics per service |
| **Cost Efficient** | Both apps share the same App Service Plan |

---

## Prerequisites

### Required Tools

```bash
# Install Azure CLI
# macOS
brew install azure-cli

# Windows (PowerShell)
winget install Microsoft.AzureCLI

# Linux (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify installation
az --version
```

```bash
# Install additional tools
# GitHub CLI (for workflow management)
brew install gh  # macOS

# Docker (for building container images)
brew install --cask docker  # macOS

# Node.js (for frontend builds)
brew install node  # macOS

# jq (for JSON parsing)
brew install jq  # macOS
```

### Required Accounts and Access

1. **Azure Subscription** with Contributor role on the resource group
2. **GitHub repository** with admin access
3. **Canvas LMS** developer application credentials
4. **Azure OpenAI** resource with API key

### Verify Azure CLI Login

```bash
# Login to Azure
az login

# Set your subscription
az account list --output table
az account set --subscription "Your Subscription Name"

# Verify
az account show
```

---

## Azure Services Summary

| Service | Purpose | Tier | Est. Monthly Cost |
|---------|---------|------|-------------------|
| **App Service Plan** | Compute for both apps | Basic B1 | ~$13 |
| **App Service (Backend)** | FastAPI container | (included in plan) | $0 |
| **App Service (Frontend)** | React SPA serving | (included in plan) | $0 |
| **PostgreSQL Flexible Server** | Database | Burstable B1ms | ~$26 |
| **Key Vault** | Secrets management | Standard | ~$1 |
| **Container Registry** | Docker images | Basic | ~$5 |
| **Log Analytics** | Logging and monitoring | Pay-per-GB | ~$5 |

**Total Estimated Monthly Cost (Test Environment):** ~$50

---

## Phase 1: Azure Foundation Setup

### Step 1.1: Verify Resource Group

```bash
# Set variables
RESOURCE_GROUP="p-qzcrft-test-appservice"
LOCATION="westeurope"

# Verify resource group exists
az group show --name $RESOURCE_GROUP --output table
```

### Step 1.2: Register Required Resource Providers

```bash
# Register resource providers (may already be registered)
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.OperationalInsights

# Verify registration status
az provider show --namespace Microsoft.Web --query "registrationState" -o tsv
```

### Step 1.3: Configure OpenID Connect (OIDC) for GitHub Actions

If not already configured (see AUDIT_TRAIL.md for existing setup):

```bash
APP_NAME="quizcrafter-github-oidc"
GITHUB_ORG="solarmarius"
GITHUB_REPO="quizcrafter"

# Get the existing App ID
APP_ID=$(az ad app list --display-name $APP_NAME --query "[0].appId" -o tsv)
echo "App ID: $APP_ID"

# Verify federated credentials exist
az ad app federated-credential list --id $APP_ID --output table
```

---

## Phase 2: Infrastructure as Code (Bicep)

### Directory Structure

```
infrastructure/
├── modules/
│   ├── app-service-plan.bicep      # NEW - App Service Plan
│   ├── app-service-backend.bicep   # NEW - Backend App Service
│   ├── app-service-frontend.bicep  # NEW - Frontend App Service
│   ├── container-registry.bicep    # Existing
│   ├── key-vault.bicep             # Existing
│   ├── postgresql.bicep            # Existing
│   └── log-analytics.bicep         # Existing
├── environments/
│   ├── test/
│   │   └── main.bicep              # Container Apps version
│   └── test-appservice/
│       └── main.bicep              # NEW - App Service version
```

### Step 2.1: App Service Plan Module

**File:** `infrastructure/modules/app-service-plan.bicep`

```bicep
@description('Name of the App Service Plan')
param planName string

@description('Location for the App Service Plan')
param location string = resourceGroup().location

@description('SKU name (B1, B2, B3, S1, P1v3, etc.)')
param skuName string = 'B1'

@description('SKU tier (Basic, Standard, Premium, PremiumV3)')
param skuTier string = 'Basic'

@description('Number of workers (instances)')
param capacity int = 1

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: skuName
    tier: skuTier
    capacity: capacity
  }
  properties: {
    reserved: true  // Required for Linux App Service Plans
  }
}

output planId string = appServicePlan.id
output planName string = appServicePlan.name
```

### Step 2.2: Backend App Service Module

**File:** `infrastructure/modules/app-service-backend.bicep`

```bicep
@description('Name of the App Service')
param appName string

@description('Location for the App Service')
param location string = resourceGroup().location

@description('App Service Plan ID')
param appServicePlanId string

@description('Container image (full path including registry)')
param containerImage string

@description('Container Registry URL')
param containerRegistryUrl string

@description('Container Registry username')
param containerRegistryUsername string

@description('Container Registry password')
@secure()
param containerRegistryPassword string

@description('Key Vault name for secret references')
param keyVaultName string

@description('Log Analytics workspace ID')
param logAnalyticsWorkspaceId string

@description('PostgreSQL server FQDN')
param postgresServer string

@description('PostgreSQL database name')
param postgresDatabase string

@description('PostgreSQL username')
param postgresUser string

@description('Frontend URL for CORS')
param frontendUrl string

resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerImage}'
      alwaysOn: true
      ftpsState: 'Disabled'
      http20Enabled: true
      healthCheckPath: '/utils/health-check/'
      appSettings: [
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: containerRegistryUrl }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: containerRegistryUsername }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: containerRegistryPassword }
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'POSTGRES_SERVER', value: postgresServer }
        { name: 'POSTGRES_PORT', value: '5432' }
        { name: 'POSTGRES_DB', value: postgresDatabase }
        { name: 'POSTGRES_USER', value: postgresUser }
        { name: 'ENVIRONMENT', value: 'production' }
        { name: 'FRONTEND_HOST', value: frontendUrl }
        // Key Vault references
        { name: 'SECRET_KEY', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=SECRET-KEY)' }
        { name: 'POSTGRES_PASSWORD', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=POSTGRES-PASSWORD)' }
        { name: 'CANVAS_CLIENT_ID', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CANVAS-CLIENT-ID)' }
        { name: 'CANVAS_CLIENT_SECRET', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CANVAS-CLIENT-SECRET)' }
        { name: 'CANVAS_BASE_URL', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CANVAS-BASE-URL)' }
        { name: 'CANVAS_REDIRECT_URI', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CANVAS-REDIRECT-URI)' }
        { name: 'AZURE_OPENAI_API_KEY', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-OPENAI-API-KEY)' }
        { name: 'AZURE_OPENAI_ENDPOINT', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-OPENAI-ENDPOINT)' }
        { name: 'AZURE_OPENAI_API_VERSION', value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-OPENAI-API-VERSION)' }
      ]
    }
  }
}

// Diagnostic settings
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '${appName}-diagnostics'
  scope: appService
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { category: 'AppServiceHTTPLogs', enabled: true }
      { category: 'AppServiceConsoleLogs', enabled: true }
      { category: 'AppServiceAppLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

output appUrl string = 'https://${appService.properties.defaultHostName}'
output appName string = appService.name
output principalId string = appService.identity.principalId
```

### Step 2.3: Frontend App Service Module

**File:** `infrastructure/modules/app-service-frontend.bicep`

```bicep
@description('Name of the App Service')
param appName string

@description('Location')
param location string = resourceGroup().location

@description('App Service Plan ID')
param appServicePlanId string

@description('Backend API URL')
param backendApiUrl string

@description('Log Analytics workspace ID')
param logAnalyticsWorkspaceId string

resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      http20Enabled: true
      appCommandLine: 'pm2 serve /home/site/wwwroot --no-daemon --spa'
      appSettings: [
        { name: 'VITE_API_URL', value: backendApiUrl }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
      ]
    }
  }
}

// Diagnostic settings
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '${appName}-diagnostics'
  scope: appService
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { category: 'AppServiceHTTPLogs', enabled: true }
      { category: 'AppServiceConsoleLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

output appUrl string = 'https://${appService.properties.defaultHostName}'
output appName string = appService.name
```

---

## Phase 3: Deploy Infrastructure

### Step 3.1: Validate Bicep Template

```bash
az deployment group validate \
  --resource-group p-qzcrft-test-appservice \
  --template-file infrastructure/environments/test-appservice/main.bicep \
  --parameters postgresAdminPassword="TempPassword123!" \
               adminObjectId="$(az ad signed-in-user show --query id -o tsv)"
```

### Step 3.2: Deploy Infrastructure

```bash
# Set the PostgreSQL password (save this securely!)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
echo "PostgreSQL Password: $POSTGRES_PASSWORD"

# Deploy infrastructure
az deployment group create \
  --name "appservice-$(date +%Y%m%d%H%M)" \
  --resource-group p-qzcrft-test-appservice \
  --template-file infrastructure/environments/test-appservice/main.bicep \
  --parameters postgresAdminPassword="$POSTGRES_PASSWORD" \
               adminObjectId="$(az ad signed-in-user show --query id -o tsv)"
```

### Step 3.3: Verify Deployment

```bash
# List deployed resources
az resource list --resource-group p-qzcrft-test-appservice --output table

# Get deployment outputs
az deployment group show \
  --name "appservice-<timestamp>" \
  --resource-group p-qzcrft-test-appservice \
  --query properties.outputs
```

---

## Phase 4: Container Registry Setup

### Step 4.1: Login to ACR

```bash
ACR_NAME="qzcrfttestacr"
az acr login --name $ACR_NAME
```

### Step 4.2: Build and Push Backend Image

```bash
# Build for linux/amd64 (required for App Service)
docker build --platform linux/amd64 \
  -t $ACR_NAME.azurecr.io/quizcrafter-backend:latest \
  ./backend

# Push to ACR
docker push $ACR_NAME.azurecr.io/quizcrafter-backend:latest

# Tag with commit SHA for versioning
COMMIT_SHA=$(git rev-parse --short HEAD)
docker tag $ACR_NAME.azurecr.io/quizcrafter-backend:latest \
  $ACR_NAME.azurecr.io/quizcrafter-backend:$COMMIT_SHA
docker push $ACR_NAME.azurecr.io/quizcrafter-backend:$COMMIT_SHA
```

### Step 4.3: Verify Image

```bash
az acr repository show-tags --name $ACR_NAME --repository quizcrafter-backend --output table
```

---

## Phase 5: Key Vault Configuration

### Step 5.1: Add Secrets (if not already present)

```bash
KEY_VAULT_NAME="qzcrft-test-kv"

# Check existing secrets
az keyvault secret list --vault-name $KEY_VAULT_NAME --query "[].name" -o tsv

# Add any missing secrets
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "SECRET-KEY" \
  --value "$(openssl rand -hex 32)"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "POSTGRES-PASSWORD" \
  --value "$POSTGRES_PASSWORD"

# Canvas OAuth credentials
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "CANVAS-CLIENT-ID" \
  --value "your-canvas-client-id"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "CANVAS-CLIENT-SECRET" \
  --value "your-canvas-client-secret"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "CANVAS-BASE-URL" \
  --value "https://uit.instructure.com"

# Azure OpenAI credentials
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "AZURE-OPENAI-API-KEY" \
  --value "your-azure-openai-key"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "AZURE-OPENAI-ENDPOINT" \
  --value "https://your-resource.openai.azure.com/"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "AZURE-OPENAI-API-VERSION" \
  --value "2024-02-15-preview"
```

### Step 5.2: Grant Key Vault Access to Backend App Service

```bash
# Get the backend's managed identity principal ID
BACKEND_PRINCIPAL=$(az webapp identity show \
  --name qzcrft-test-api \
  --resource-group p-qzcrft-test-appservice \
  --query principalId -o tsv)

echo "Backend Principal ID: $BACKEND_PRINCIPAL"

# Grant Key Vault access
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $BACKEND_PRINCIPAL \
  --secret-permissions get list
```

---

## Phase 6: Backend App Service Deployment

### Step 6.1: Configure Container Settings

```bash
# Configure the container image
az webapp config container set \
  --name qzcrft-test-api \
  --resource-group p-qzcrft-test-appservice \
  --container-image-name qzcrfttestacr.azurecr.io/quizcrafter-backend:latest \
  --container-registry-url https://qzcrfttestacr.azurecr.io \
  --container-registry-user $(az acr credential show --name qzcrfttestacr --query username -o tsv) \
  --container-registry-password $(az acr credential show --name qzcrfttestacr --query "passwords[0].value" -o tsv)
```

### Step 6.2: Update Canvas Redirect URI

```bash
# Set the redirect URI for Canvas OAuth
BACKEND_URL="https://qzcrft-test-api.azurewebsites.net"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "CANVAS-REDIRECT-URI" \
  --value "${BACKEND_URL}/auth/callback/canvas"
```

### Step 6.3: Restart and Verify

```bash
# Restart the app to apply changes
az webapp restart --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# Check health endpoint
curl https://qzcrft-test-api.azurewebsites.net/utils/health-check/

# View logs
az webapp log tail --name qzcrft-test-api --resource-group p-qzcrft-test-appservice
```

---

## Phase 7: Frontend App Service Deployment

### Step 7.1: Build Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Build with backend URL
VITE_API_URL="https://qzcrft-test-api.azurewebsites.net" npm run build
```

### Step 7.2: Deploy to App Service

```bash
# Create a zip of the dist folder
cd dist
zip -r ../frontend-dist.zip .
cd ..

# Deploy using zip deploy
az webapp deploy \
  --name qzcrft-test-web \
  --resource-group p-qzcrft-test-appservice \
  --src-path frontend-dist.zip \
  --type zip

# Or use the Azure CLI webapp deployment
az webapp deployment source config-zip \
  --name qzcrft-test-web \
  --resource-group p-qzcrft-test-appservice \
  --src frontend-dist.zip
```

### Step 7.3: Verify Frontend

```bash
# Check frontend is accessible
curl -I https://qzcrft-test-web.azurewebsites.net

# View logs
az webapp log tail --name qzcrft-test-web --resource-group p-qzcrft-test-appservice
```

---

## Phase 8: Database Migration

### Step 8.1: Run Migrations via SSH

```bash
# Open SSH session to backend container
az webapp ssh --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# Inside the container, run migrations
alembic upgrade head

# Exit SSH
exit
```

### Step 8.2: Alternative - Run via Kudu Console

1. Navigate to: `https://qzcrft-test-api.scm.azurewebsites.net`
2. Go to Debug Console > Bash
3. Run: `alembic upgrade head`

### Step 8.3: Verify Database

```bash
# Connect to PostgreSQL (requires psql client)
psql "host=qzcrft-test-db.postgres.database.azure.com port=5432 dbname=quizcrafter user=quizcrafteradmin sslmode=require"

# Check tables
\dt

# Check Alembic version
SELECT * FROM alembic_version;
```

---

## Phase 9: Custom Domains and SSL

### Step 9.1: Add Custom Domain to Backend

```bash
BACKEND_DOMAIN="api.quizcrafter.yourdomain.com"

# Add custom domain
az webapp config hostname add \
  --webapp-name qzcrft-test-api \
  --resource-group p-qzcrft-test-appservice \
  --hostname $BACKEND_DOMAIN

# Get validation token for DNS
az webapp config hostname list \
  --webapp-name qzcrft-test-api \
  --resource-group p-qzcrft-test-appservice \
  --output table
```

**DNS Configuration:**
1. Add CNAME record: `api` → `qzcrft-test-api.azurewebsites.net`
2. Add TXT record: `asuid.api` → `<validation-token>`

```bash
# After DNS propagation, create managed certificate
az webapp config ssl create \
  --name qzcrft-test-api \
  --resource-group p-qzcrft-test-appservice \
  --hostname $BACKEND_DOMAIN

# Bind the certificate
az webapp config ssl bind \
  --name qzcrft-test-api \
  --resource-group p-qzcrft-test-appservice \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

### Step 9.2: Add Custom Domain to Frontend

```bash
FRONTEND_DOMAIN="quizcrafter.yourdomain.com"

az webapp config hostname add \
  --webapp-name qzcrft-test-web \
  --resource-group p-qzcrft-test-appservice \
  --hostname $FRONTEND_DOMAIN

# Same process for SSL certificate
```

### Step 9.3: Update OAuth Redirect URI

After adding custom domain, update the Canvas redirect URI:

```bash
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "CANVAS-REDIRECT-URI" \
  --value "https://${BACKEND_DOMAIN}/auth/callback/canvas"

# Restart backend to pick up new secret
az webapp restart --name qzcrft-test-api --resource-group p-qzcrft-test-appservice
```

---

## Phase 10: CI/CD Pipeline Setup

### Step 10.1: GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Value |
|-------------|-------|
| `AZURE_CLIENT_ID` | Microsoft Entra Application ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `ACR_NAME` | `qzcrfttestacr` |

### Step 10.2: Backend Deployment Workflow

**File:** `.github/workflows/deploy-backend-appservice.yml`

```yaml
name: Deploy Backend to App Service

on:
  push:
    branches: [main]
    paths: ['backend/**']
  workflow_dispatch:

env:
  AZURE_WEBAPP_NAME: qzcrft-test-api
  RESOURCE_GROUP: p-qzcrft-test-appservice
  ACR_NAME: qzcrfttestacr
  IMAGE_NAME: quizcrafter-backend

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.10"

      - name: Install uv
        uses: astral-sh/setup-uv@v4

      - name: Install dependencies
        run: uv sync
        working-directory: backend

      - name: Run tests
        run: uv run bash scripts/test.sh
        working-directory: backend
        env:
          POSTGRES_SERVER: localhost
          POSTGRES_PORT: 5432
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Login to ACR
        run: az acr login --name ${{ env.ACR_NAME }}

      - name: Build and Push
        run: |
          docker build --platform linux/amd64 \
            -t ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -t ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:latest \
            ./backend
          docker push ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }} --all-tags

      - name: Deploy to App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          images: ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### Step 10.3: Frontend Deployment Workflow

**File:** `.github/workflows/deploy-frontend-appservice.yml`

```yaml
name: Deploy Frontend to App Service

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  workflow_dispatch:

env:
  AZURE_WEBAPP_NAME: qzcrft-test-web
  RESOURCE_GROUP: p-qzcrft-test-appservice
  BACKEND_URL: https://qzcrft-test-api.azurewebsites.net

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install and Build
        run: |
          cd frontend
          npm ci
          VITE_API_URL="${{ env.BACKEND_URL }}" npm run build

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          package: frontend/dist
```

---

## Phase 11: Monitoring and Observability

### Step 11.1: View Logs in Azure Portal

1. Navigate to App Service > **Monitoring** > **Log stream**
2. Or use **App Service logs** for file-based logging

### Step 11.2: Log Analytics Queries

Access Log Analytics in Azure Portal and run these queries:

**Application Errors:**
```kusto
AppServiceConsoleLogs
| where ResultDescription contains "ERROR" or ResultDescription contains "Exception"
| project TimeGenerated, Host, ResultDescription
| order by TimeGenerated desc
| take 100
```

**HTTP Request Analysis:**
```kusto
AppServiceHTTPLogs
| summarize count() by tostring(ScStatus), bin(TimeGenerated, 1h)
| render timechart
```

**Response Time Percentiles:**
```kusto
AppServiceHTTPLogs
| summarize
    avg(TimeTaken),
    percentile(TimeTaken, 50),
    percentile(TimeTaken, 95),
    percentile(TimeTaken, 99)
    by bin(TimeGenerated, 5m)
| render timechart
```

### Step 11.3: Create Alerts

```bash
# Alert: High error rate (5xx responses)
az monitor metrics alert create \
  --name "HighErrorRate-Backend" \
  --resource-group p-qzcrft-test-appservice \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/p-qzcrft-test-appservice/providers/Microsoft.Web/sites/qzcrft-test-api" \
  --condition "total Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2

# Alert: High response time
az monitor metrics alert create \
  --name "HighResponseTime-Backend" \
  --resource-group p-qzcrft-test-appservice \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/p-qzcrft-test-appservice/providers/Microsoft.Web/sites/qzcrft-test-api" \
  --condition "avg HttpResponseTime > 5000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3
```

---

## Post-Deployment Validation

### Functional Checklist

```bash
# 1. Backend health check
curl https://qzcrft-test-api.azurewebsites.net/utils/health-check/

# 2. Backend API docs
curl -I https://qzcrft-test-api.azurewebsites.net/docs

# 3. Frontend loads
curl -I https://qzcrft-test-web.azurewebsites.net
```

### Manual Testing Checklist

- [ ] Frontend loads correctly
- [ ] Canvas OAuth login works
- [ ] Course list displays
- [ ] Quiz creation flow completes
- [ ] Question generation works
- [ ] Question review/approval works
- [ ] Export to Canvas works
- [ ] Logs appear in Log Analytics

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check container logs
az webapp log tail --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# Check for startup errors
az webapp log download --name qzcrft-test-api --resource-group p-qzcrft-test-appservice --log-file logs.zip
```

#### 2. Key Vault Access Denied

```bash
# Verify managed identity exists
az webapp identity show --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# Verify Key Vault access policy
az keyvault show --name qzcrft-test-kv --query "properties.accessPolicies"
```

#### 3. Database Connection Failed

```bash
# Test connectivity via SSH
az webapp ssh --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# Inside container
python -c "from src.core.db import engine; print(engine.connect())"
```

#### 4. Frontend 404 on Routes

Ensure PM2 is serving with SPA mode:
```bash
# Check app command line
az webapp config show --name qzcrft-test-web --resource-group p-qzcrft-test-appservice --query "appCommandLine"
```

The command should be: `pm2 serve /home/site/wwwroot --no-daemon --spa`

#### 5. CORS Errors

Verify `FRONTEND_HOST` environment variable is set correctly in backend.

---

## Cost Management

### Monitor Spending

```bash
# View costs for resource group
az consumption usage list \
  --start-date $(date -d "$(date +%Y-%m-01)" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[?contains(instanceId, 'p-qzcrft-test-appservice')].{Resource:instanceName, Cost:pretaxCost}" \
  --output table
```

### Cost Optimization Tips

1. **Use B1 for test/dev** - Basic tier is sufficient for low traffic
2. **Scale down when not in use** - Stop App Service Plan outside working hours
3. **Review Log Analytics retention** - 30 days is usually sufficient
4. **Consider reserved instances** for production (1-year saves ~30%)

---

## Comparison: App Service vs Container Apps

| Feature | App Service | Container Apps |
|---------|-------------|----------------|
| **Pricing** | Fixed (always-on) | Consumption (pay per use) |
| **Scale to zero** | No | Yes |
| **Min instances** | 1 | 0 |
| **Cold start** | No | Yes (when scaled to 0) |
| **Deployment** | Code or container | Container only |
| **Custom domains** | Yes | Yes |
| **SSL certificates** | Managed | Managed |
| **Deployment slots** | Yes (Standard+) | No (use revisions) |
| **WebSockets** | Yes | Yes |
| **Health probes** | Built-in | Custom |
| **Best for** | Traditional web apps | Microservices, event-driven |

### When to Choose App Service

- Predictable, steady traffic
- Need deployment slots for blue-green deployments
- Simpler deployment model preferred
- Don't need scale-to-zero

### When to Choose Container Apps

- Variable/bursty traffic
- Want to minimize costs with scale-to-zero
- Microservices architecture
- Event-driven workloads

---

## Quick Reference Commands

```bash
# View backend logs
az webapp log tail --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# View frontend logs
az webapp log tail --name qzcrft-test-web --resource-group p-qzcrft-test-appservice

# Restart backend
az webapp restart --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# Restart frontend
az webapp restart --name qzcrft-test-web --resource-group p-qzcrft-test-appservice

# SSH into backend container
az webapp ssh --name qzcrft-test-api --resource-group p-qzcrft-test-appservice

# Deploy new backend image
az webapp config container set \
  --name qzcrft-test-api \
  --resource-group p-qzcrft-test-appservice \
  --container-image-name qzcrfttestacr.azurecr.io/quizcrafter-backend:latest

# Scale App Service Plan
az appservice plan update \
  --name qzcrft-test-plan \
  --resource-group p-qzcrft-test-appservice \
  --sku B2

# Check App Service status
az webapp show --name qzcrft-test-api --resource-group p-qzcrft-test-appservice \
  --query "{state:state, hostNames:hostNames}"
```

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-28 | Claude Code | Initial document creation |

---

## Sources

- [Deploy Python FastAPI to App Service](https://learn.microsoft.com/en-us/azure/app-service/quickstart-python)
- [FastAPI + PostgreSQL Tutorial](https://learn.microsoft.com/en-us/azure/app-service/tutorial-python-postgresql-app-fastapi)
- [React deployment on App Service Linux](https://azureossd.github.io/2022/02/07/React-Deployment-on-App-Service-Linux/)
- [Key Vault with Managed Identity](https://techcommunity.microsoft.com/blog/appsonazureblog/how-to-connect-azure-key-vault-from-python-app-service-using-managed-identity/4088152)
- [GitHub Actions OIDC for Azure](https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure)
- [App Service Pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/)
- [PM2 serve for SPA](https://azureossd.github.io/2022/02/07/React-Deployment-on-App-Service-Linux/)
