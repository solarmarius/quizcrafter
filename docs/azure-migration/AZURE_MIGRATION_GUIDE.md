# QuizCrafter Azure Migration Guide

This guide provides comprehensive instructions for migrating QuizCrafter from a Docker Compose-based local server to Azure cloud services.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Azure Services Summary](#azure-services-summary)
4. [Phase 1: Azure Foundation Setup](#phase-1-azure-foundation-setup)
5. [Phase 2: Infrastructure as Code (Bicep)](#phase-2-infrastructure-as-code-bicep)
6. [Phase 3: Database Migration](#phase-3-database-migration)
7. [Phase 4: Container Registry Setup](#phase-4-container-registry-setup)
8. [Phase 5: Key Vault Configuration](#phase-5-key-vault-configuration)
9. [Phase 6: Container Apps Deployment](#phase-6-container-apps-deployment)
10. [Phase 7: Static Web Apps Deployment](#phase-7-static-web-apps-deployment)
11. [Phase 8: Custom Domains and SSL](#phase-8-custom-domains-and-ssl)
12. [Phase 9: CI/CD Pipeline Setup](#phase-9-cicd-pipeline-setup)
13. [Phase 10: Monitoring and Observability](#phase-10-monitoring-and-observability)
14. [Post-Migration Validation](#post-migration-validation)
15. [Troubleshooting](#troubleshooting)
16. [Cost Management](#cost-management)

---

## Architecture Overview

### Current Architecture (Docker Compose)

```
┌─────────────────────────────────────────────────────────┐
│                    Local Server                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Traefik   │  │   Backend   │  │  Frontend   │    │
│  │   (proxy)   │  │  (FastAPI)  │  │   (Nginx)   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │    Loki     │  │   Grafana   │    │
│  │     17      │  │   (logs)    │  │ (dashboards)│    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (Azure)

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Azure Cloud                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                  Azure Static Web Apps (Free)                   │  │
│  │  • React SPA with global CDN                                    │  │
│  │  • Automatic SSL certificates                                   │  │
│  │  • GitHub Actions integration                                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                   │                                   │
│                                   │ API Calls (HTTPS)                 │
│                                   ▼                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Azure Container Apps Environment                   │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐           │  │
│  │  │   Backend App        │  │   Grafana App        │           │  │
│  │  │   (FastAPI)          │  │   (Optional)         │           │  │
│  │  │   • Scale 0-4        │  │   • Custom dashboards│           │  │
│  │  │   • Managed SSL      │  │                      │           │  │
│  │  └──────────────────────┘  └──────────────────────┘           │  │
│  │                                                                 │  │
│  │  ┌──────────────────────┐                                      │  │
│  │  │   Migration Job      │  (Container Apps Jobs)               │  │
│  │  │   (Alembic)          │                                      │  │
│  │  └──────────────────────┘                                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│           │                    │                    │                 │
│           ▼                    ▼                    ▼                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   Key Vault     │  │   PostgreSQL    │  │  Log Analytics  │      │
│  │   • Secrets     │  │   Flexible      │  │  • App logs     │      │
│  │   • Canvas creds│  │   Server        │  │  • Metrics      │      │
│  │   • API keys    │  │   (Burstable)   │  │  • Alerts       │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Azure Container Registry (Basic)                   │  │
│  │              • Backend Docker images                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  External Services: Canvas LMS (OAuth), Azure OpenAI                  │
└──────────────────────────────────────────────────────────────────────┘
```

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
winget install GitHub.cli  # Windows

# jq (for JSON parsing)
brew install jq  # macOS
```

### Required Accounts and Access

1. **Azure Subscription** with Owner or Contributor role
2. **GitHub repository** with admin access
3. **Canvas LMS** developer application credentials
4. **Azure OpenAI** resource (you already have this)

### Verify Azure CLI Login

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account list --output table
az account set --subscription "Your Subscription Name"

# Verify
az account show
```

---

## Azure Services Summary

| Service | Purpose | Tier | Est. Monthly Cost |
|---------|---------|------|-------------------|
| **Container Apps** | Backend API hosting | Consumption | ~$54 (prod) |
| **Static Web Apps** | Frontend React SPA | Free | $0 |
| **PostgreSQL Flexible Server** | Database | Burstable B1ms/B2s | ~$26-52 |
| **Key Vault** | Secrets management | Standard | ~$1 |
| **Container Registry** | Docker images | Basic | ~$5 |
| **Log Analytics** | Logging and monitoring | Pay-per-GB | ~$24 |
| **Azure DNS** | Domain management | Standard | ~$0.50 |

**Total Estimated Monthly Cost:**
- Development: ~$51
- Staging: ~$84
- Production: ~$163

---

## Phase 1: Azure Foundation Setup

### Step 1.1: Create Resource Groups

Create a resource group for each environment:

```bash
# Set variables
LOCATION="norwayeast"  # Choose your preferred region
APP_NAME="quizcrafter"

# Create resource groups for each environment
az group create --name "${APP_NAME}-dev-rg" --location $LOCATION
az group create --name "${APP_NAME}-staging-rg" --location $LOCATION
az group create --name "${APP_NAME}-prod-rg" --location $LOCATION

# Create a shared resource group for common resources
az group create --name "${APP_NAME}-shared-rg" --location $LOCATION
```

### Step 1.2: Register Required Resource Providers

```bash
# Register resource providers (may already be registered)
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.Web

# Verify registration status
az provider show --namespace Microsoft.App --query "registrationState"
```

### Step 1.3: Create Service Principal for GitHub Actions

```bash
# Create service principal with Contributor role on subscription
SP_NAME="${APP_NAME}-github-actions"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad sp create-for-rbac \
  --name $SP_NAME \
  --role Contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID \
  --sdk-auth > azure-credentials.json

# IMPORTANT: Save this output - you'll need it for GitHub secrets
cat azure-credentials.json
```

**Store the output as a GitHub secret named `AZURE_CREDENTIALS`.**

---

## Phase 2: Infrastructure as Code (Bicep)

Create the following directory structure in your repository:

```
infrastructure/
├── modules/
│   ├── container-registry.bicep
│   ├── key-vault.bicep
│   ├── postgresql.bicep
│   ├── container-apps-env.bicep
│   ├── container-app.bicep
│   ├── static-web-app.bicep
│   └── log-analytics.bicep
├── environments/
│   ├── dev/
│   │   └── main.bicep
│   ├── staging/
│   │   └── main.bicep
│   └── prod/
│       └── main.bicep
└── main.bicep
```

### Step 2.1: Log Analytics Module

Create `infrastructure/modules/log-analytics.bicep`:

```bicep
@description('Name of the Log Analytics workspace')
param workspaceName string

@description('Location for the workspace')
param location string = resourceGroup().location

@description('SKU for the workspace')
param sku string = 'PerGB2018'

@description('Retention period in days')
param retentionInDays int = 30

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: workspaceName
  location: location
  properties: {
    sku: {
      name: sku
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

output workspaceId string = logAnalytics.id
output workspaceName string = logAnalytics.name
output customerId string = logAnalytics.properties.customerId
```

### Step 2.2: Key Vault Module

Create `infrastructure/modules/key-vault.bicep`:

```bicep
@description('Name of the Key Vault')
param keyVaultName string

@description('Location for the Key Vault')
param location string = resourceGroup().location

@description('Object ID of the service principal or user to grant access')
param adminObjectId string

@description('Enable soft delete')
param enableSoftDelete bool = true

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: enableSoftDelete
    softDeleteRetentionInDays: 7
    enablePurgeProtection: false  // Set to true for production
  }
}

// Grant Key Vault Administrator role to admin
resource adminRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, adminObjectId, 'Key Vault Administrator')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00482a5a-887f-4fb3-b363-3b7fe8e74483')
    principalId: adminObjectId
    principalType: 'ServicePrincipal'
  }
}

output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultName string = keyVault.name
output keyVaultId string = keyVault.id
```

### Step 2.3: PostgreSQL Module

Create `infrastructure/modules/postgresql.bicep`:

```bicep
@description('Name of the PostgreSQL server')
param serverName string

@description('Location for the server')
param location string = resourceGroup().location

@description('Administrator username')
param administratorLogin string

@description('Administrator password')
@secure()
param administratorPassword string

@description('Database name')
param databaseName string = 'quizcrafter'

@description('SKU name (e.g., Standard_B1ms, Standard_B2s)')
param skuName string = 'Standard_B1ms'

@description('Storage size in GB')
param storageSizeGB int = 32

@description('PostgreSQL version')
param version string = '17'

@description('Enable high availability')
param highAvailability bool = false

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: skuName
    tier: contains(skuName, 'B') ? 'Burstable' : 'GeneralPurpose'
  }
  properties: {
    version: version
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: highAvailability ? 'ZoneRedundant' : 'Disabled'
    }
  }
}

// Create the database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Allow Azure services to access the server
resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Configure PgBouncer for connection pooling
resource pgBouncerConfig 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-06-01-preview' = {
  parent: postgresServer
  name: 'pgbouncer.enabled'
  properties: {
    value: 'true'
    source: 'user-override'
  }
}

output serverFqdn string = postgresServer.properties.fullyQualifiedDomainName
output serverName string = postgresServer.name
output databaseName string = database.name
```

### Step 2.4: Container Registry Module

Create `infrastructure/modules/container-registry.bicep`:

```bicep
@description('Name of the Container Registry')
param registryName string

@description('Location for the registry')
param location string = resourceGroup().location

@description('SKU for the registry')
param sku string = 'Basic'

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: {
    name: sku
  }
  properties: {
    adminUserEnabled: true
  }
}

output loginServer string = containerRegistry.properties.loginServer
output registryName string = containerRegistry.name
output registryId string = containerRegistry.id
```

### Step 2.5: Container Apps Environment Module

Create `infrastructure/modules/container-apps-env.bicep`:

```bicep
@description('Name of the Container Apps Environment')
param environmentName string

@description('Location for the environment')
param location string = resourceGroup().location

@description('Log Analytics workspace ID')
param logAnalyticsWorkspaceId string

@description('Log Analytics workspace customer ID')
param logAnalyticsCustomerId string

@description('Log Analytics workspace shared key')
@secure()
param logAnalyticsSharedKey string

resource containerAppsEnv 'Microsoft.App/managedEnvironments@2023-11-02-preview' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsSharedKey
      }
    }
    zoneRedundant: false
  }
}

output environmentId string = containerAppsEnv.id
output environmentName string = containerAppsEnv.name
output defaultDomain string = containerAppsEnv.properties.defaultDomain
```

### Step 2.6: Container App Module

Create `infrastructure/modules/container-app.bicep`:

```bicep
@description('Name of the Container App')
param appName string

@description('Location for the app')
param location string = resourceGroup().location

@description('Container Apps Environment ID')
param environmentId string

@description('Container image to deploy')
param containerImage string

@description('Container Registry login server')
param registryLoginServer string

@description('Container Registry username')
param registryUsername string

@description('Container Registry password')
@secure()
param registryPassword string

@description('Key Vault URI')
param keyVaultUri string

@description('Environment variables (non-sensitive)')
param envVars array = []

@description('Secrets from Key Vault')
param keyVaultSecrets array = []

@description('Minimum replicas')
param minReplicas int = 0

@description('Maximum replicas')
param maxReplicas int = 4

@description('CPU cores')
param cpu string = '0.5'

@description('Memory')
param memory string = '1Gi'

@description('Enable external ingress')
param externalIngress bool = true

@description('Target port')
param targetPort int = 8000

// Create user-assigned managed identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${appName}-identity'
  location: location
}

// Create the Container App
resource containerApp 'Microsoft.App/containerApps@2023-11-02-preview' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: externalIngress ? {
        external: true
        targetPort: targetPort
        transport: 'http'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      } : null
      registries: [
        {
          server: registryLoginServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: concat([
        {
          name: 'registry-password'
          value: registryPassword
        }
      ], [for secret in keyVaultSecrets: {
        name: secret.name
        keyVaultUrl: '${keyVaultUri}secrets/${secret.keyVaultSecretName}'
        identity: managedIdentity.id
      }])
    }
    template: {
      containers: [
        {
          name: appName
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: concat(envVars, [for secret in keyVaultSecrets: {
            name: secret.envVarName
            secretRef: secret.name
          }])
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

output appUrl string = externalIngress ? 'https://${containerApp.properties.configuration.ingress.fqdn}' : ''
output appName string = containerApp.name
output managedIdentityPrincipalId string = managedIdentity.properties.principalId
output managedIdentityId string = managedIdentity.id
```

### Step 2.7: Static Web App Module

Create `infrastructure/modules/static-web-app.bicep`:

```bicep
@description('Name of the Static Web App')
param appName string

@description('Location for the app')
param location string = resourceGroup().location

@description('SKU for the app')
param sku string = 'Free'

@description('GitHub repository URL')
param repositoryUrl string = ''

@description('GitHub repository branch')
param branch string = 'main'

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: appName
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    repositoryUrl: repositoryUrl != '' ? repositoryUrl : null
    branch: repositoryUrl != '' ? branch : null
    buildProperties: {
      appLocation: 'frontend'
      outputLocation: 'dist'
      skipGithubActionWorkflowGeneration: true
    }
  }
}

output defaultHostname string = staticWebApp.properties.defaultHostname
output appName string = staticWebApp.name
output apiKey string = listSecrets(staticWebApp.id, staticWebApp.apiVersion).properties.apiKey
```

### Step 2.8: Main Deployment File (Production Example)

Create `infrastructure/environments/prod/main.bicep`:

```bicep
@description('Environment name')
param environment string = 'prod'

@description('Application name')
param appName string = 'quizcrafter'

@description('Location')
param location string = resourceGroup().location

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('Service principal object ID for Key Vault access')
param adminObjectId string

@description('GitHub repository URL')
param repositoryUrl string = ''

// Variables
var resourcePrefix = '${appName}-${environment}'

// Log Analytics
module logAnalytics '../modules/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    workspaceName: '${resourcePrefix}-logs'
    location: location
    retentionInDays: 30
  }
}

// Key Vault
module keyVault '../modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    keyVaultName: '${resourcePrefix}-kv'
    location: location
    adminObjectId: adminObjectId
  }
}

// PostgreSQL
module postgresql '../modules/postgresql.bicep' = {
  name: 'postgresql'
  params: {
    serverName: '${resourcePrefix}-db'
    location: location
    administratorLogin: 'quizcrafteradmin'
    administratorPassword: postgresAdminPassword
    databaseName: 'quizcrafter'
    skuName: 'Standard_B2s'  // Larger for production
    storageSizeGB: 64
  }
}

// Container Registry (shared, deploy to shared resource group)
module containerRegistry '../modules/container-registry.bicep' = {
  name: 'containerRegistry'
  scope: resourceGroup('${appName}-shared-rg')
  params: {
    registryName: '${appName}acr'  // Must be globally unique, alphanumeric only
    location: location
  }
}

// Container Apps Environment
module containerAppsEnv '../modules/container-apps-env.bicep' = {
  name: 'containerAppsEnv'
  params: {
    environmentName: '${resourcePrefix}-env'
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    logAnalyticsCustomerId: logAnalytics.outputs.customerId
    logAnalyticsSharedKey: listKeys(logAnalytics.outputs.workspaceId, '2022-10-01').primarySharedKey
  }
}

// Static Web App
module staticWebApp '../modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    appName: '${resourcePrefix}-frontend'
    location: location
    repositoryUrl: repositoryUrl
  }
}

// Outputs
output logAnalyticsWorkspaceId string = logAnalytics.outputs.workspaceId
output keyVaultUri string = keyVault.outputs.keyVaultUri
output postgresServerFqdn string = postgresql.outputs.serverFqdn
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output containerAppsEnvironmentId string = containerAppsEnv.outputs.environmentId
output staticWebAppHostname string = staticWebApp.outputs.defaultHostname
output staticWebAppApiKey string = staticWebApp.outputs.apiKey
```

### Step 2.9: Deploy Infrastructure

```bash
# Deploy to production
ADMIN_OBJECT_ID=$(az ad sp show --id $(az account show --query user.name -o tsv) --query id -o tsv)

az deployment group create \
  --name "quizcrafter-prod-infra" \
  --resource-group "quizcrafter-prod-rg" \
  --template-file infrastructure/environments/prod/main.bicep \
  --parameters \
    environment=prod \
    postgresAdminPassword='YourSecurePassword123!' \
    adminObjectId=$ADMIN_OBJECT_ID

# Get outputs
az deployment group show \
  --name "quizcrafter-prod-infra" \
  --resource-group "quizcrafter-prod-rg" \
  --query properties.outputs
```

---

## Phase 3: Database Migration

### Step 3.1: Prepare Source Database

```bash
# On your current server, create a database dump
docker exec -t quizcrafter-db-1 pg_dump \
  -U postgres \
  -d app \
  -F c \
  -f /tmp/quizcrafter_backup.dump

# Copy the dump file from the container
docker cp quizcrafter-db-1:/tmp/quizcrafter_backup.dump ./quizcrafter_backup.dump
```

### Step 3.2: Get Azure PostgreSQL Connection Details

```bash
# Get the server FQDN
POSTGRES_FQDN=$(az postgres flexible-server show \
  --name quizcrafter-prod-db \
  --resource-group quizcrafter-prod-rg \
  --query fullyQualifiedDomainName -o tsv)

echo "PostgreSQL Server: $POSTGRES_FQDN"
```

### Step 3.3: Restore Database to Azure

```bash
# Install PostgreSQL client if not available
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql-client

# Restore the database
pg_restore \
  -h $POSTGRES_FQDN \
  -U quizcrafteradmin \
  -d quizcrafter \
  -F c \
  --no-owner \
  --no-privileges \
  ./quizcrafter_backup.dump

# When prompted, enter the administrator password
```

### Step 3.4: Verify Migration

```bash
# Connect to Azure PostgreSQL
psql "host=$POSTGRES_FQDN port=5432 dbname=quizcrafter user=quizcrafteradmin sslmode=require"

# Run verification queries
SELECT 'users' as table_name, COUNT(*) FROM "user"
UNION ALL
SELECT 'quizzes', COUNT(*) FROM quiz
UNION ALL
SELECT 'questions', COUNT(*) FROM question;

# Check Alembic migration version
SELECT * FROM alembic_version;

# Exit
\q
```

### Step 3.5: Run Any Pending Migrations

If there are pending migrations, run them:

```bash
# From your local machine with the backend code
cd backend

# Set environment variables for Azure PostgreSQL
export POSTGRES_SERVER=$POSTGRES_FQDN
export POSTGRES_PORT=5432
export POSTGRES_USER=quizcrafteradmin
export POSTGRES_PASSWORD='YourSecurePassword123!'
export POSTGRES_DB=quizcrafter

# Run migrations
source .venv/bin/activate
alembic upgrade head
```

---

## Phase 4: Container Registry Setup

### Step 4.1: Get Registry Credentials

```bash
# Get ACR login server and credentials
ACR_NAME="quizcrafteracr"
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

echo "Login Server: $ACR_LOGIN_SERVER"
echo "Username: $ACR_USERNAME"
```

### Step 4.2: Build and Push Backend Image

```bash
# Login to ACR
az acr login --name $ACR_NAME

# Build the backend image
docker build -t $ACR_LOGIN_SERVER/quizcrafter-backend:latest ./backend

# Push to ACR
docker push $ACR_LOGIN_SERVER/quizcrafter-backend:latest

# Tag with commit SHA for versioning
COMMIT_SHA=$(git rev-parse --short HEAD)
docker tag $ACR_LOGIN_SERVER/quizcrafter-backend:latest \
  $ACR_LOGIN_SERVER/quizcrafter-backend:$COMMIT_SHA
docker push $ACR_LOGIN_SERVER/quizcrafter-backend:$COMMIT_SHA
```

### Step 4.3: Verify Image in Registry

```bash
# List repositories
az acr repository list --name $ACR_NAME --output table

# List tags for backend image
az acr repository show-tags --name $ACR_NAME --repository quizcrafter-backend --output table
```

---

## Phase 5: Key Vault Configuration

### Step 5.1: Add Secrets to Key Vault

```bash
KEY_VAULT_NAME="quizcrafter-prod-kv"

# PostgreSQL credentials
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "postgres-password" \
  --value "YourSecurePassword123!"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "postgres-user" \
  --value "quizcrafteradmin"

# Application secrets
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "secret-key" \
  --value "$(openssl rand -hex 32)"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "first-superuser-password" \
  --value "YourAdminPassword123!"

# Canvas OAuth credentials
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "canvas-client-id" \
  --value "your-canvas-client-id"

az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "canvas-client-secret" \
  --value "your-canvas-client-secret"

# Azure OpenAI (reference your existing key)
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "azure-openai-api-key" \
  --value "your-azure-openai-key"

# Grafana admin password (optional)
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "grafana-admin-password" \
  --value "YourGrafanaPassword123!"
```

### Step 5.2: Verify Secrets

```bash
# List all secrets in the vault
az keyvault secret list --vault-name $KEY_VAULT_NAME --output table
```

---

## Phase 6: Container Apps Deployment

### Step 6.1: Grant Key Vault Access to Container App

First, deploy the Container App to get its managed identity, then grant access:

```bash
# Deploy Container App using Bicep or Azure CLI
# The managed identity will be created automatically

# Get the managed identity principal ID
IDENTITY_PRINCIPAL_ID=$(az containerapp show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --query identity.principalId -o tsv)

# Grant Key Vault Secrets User role
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/quizcrafter-prod-rg/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME"
```

### Step 6.2: Deploy Backend Container App

```bash
# Get required values
ENVIRONMENT_ID=$(az containerapp env show \
  --name quizcrafter-prod-env \
  --resource-group quizcrafter-prod-rg \
  --query id -o tsv)

KEY_VAULT_URI=$(az keyvault show \
  --name $KEY_VAULT_NAME \
  --query properties.vaultUri -o tsv)

# Create the Container App
az containerapp create \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --environment $ENVIRONMENT_ID \
  --image $ACR_LOGIN_SERVER/quizcrafter-backend:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 4 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    POSTGRES_SERVER=$POSTGRES_FQDN \
    POSTGRES_PORT=5432 \
    POSTGRES_DB=quizcrafter \
    ENVIRONMENT=production \
    CANVAS_BASE_URL=https://uit.instructure.com \
    CANVAS_API_VERSION=v1 \
    AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/ \
    AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### Step 6.3: Configure Secrets from Key Vault

```bash
# Update the app to use Key Vault secrets
# This requires updating the Container App YAML

# Export current configuration
az containerapp show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --output yaml > backend-app.yaml

# Edit backend-app.yaml to add secret references, then apply
az containerapp update \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --yaml backend-app.yaml
```

### Step 6.4: Verify Backend Deployment

```bash
# Get the backend URL
BACKEND_URL=$(az containerapp show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "Backend URL: https://$BACKEND_URL"

# Test the health endpoint
curl "https://$BACKEND_URL/api/v1/utils/health-check/"
```

---

## Phase 7: Static Web Apps Deployment

### Step 7.1: Create Static Web App

```bash
# Create the Static Web App
az staticwebapp create \
  --name quizcrafter-prod-frontend \
  --resource-group quizcrafter-prod-rg \
  --location "westeurope" \
  --sku Free
```

### Step 7.2: Get Deployment Token

```bash
# Get the deployment token for GitHub Actions
SWA_TOKEN=$(az staticwebapp secrets list \
  --name quizcrafter-prod-frontend \
  --resource-group quizcrafter-prod-rg \
  --query properties.apiKey -o tsv)

echo "Static Web App Token: $SWA_TOKEN"
# Save this as GitHub secret: AZURE_STATIC_WEB_APPS_API_TOKEN_PROD
```

### Step 7.3: Build and Deploy Frontend Manually (First Time)

```bash
cd frontend

# Install dependencies
npm ci

# Build with production API URL
VITE_API_URL="https://$BACKEND_URL" npm run build

# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./dist \
  --deployment-token $SWA_TOKEN \
  --env production
```

### Step 7.4: Get Frontend URL

```bash
FRONTEND_URL=$(az staticwebapp show \
  --name quizcrafter-prod-frontend \
  --resource-group quizcrafter-prod-rg \
  --query defaultHostname -o tsv)

echo "Frontend URL: https://$FRONTEND_URL"
```

---

## Phase 8: Custom Domains and SSL

### Step 8.1: Add Custom Domain to Backend (Container Apps)

```bash
CUSTOM_DOMAIN="api.quizcrafter.yourdomain.com"

# Add custom domain
az containerapp hostname add \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --hostname $CUSTOM_DOMAIN

# Get the verification token
az containerapp hostname list \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --output table

# Add DNS records:
# 1. CNAME: api -> <container-app-fqdn>
# 2. TXT: asuid.api -> <verification-token>

# After DNS propagation, bind the managed certificate
az containerapp hostname bind \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --hostname $CUSTOM_DOMAIN \
  --environment quizcrafter-prod-env \
  --validation-method CNAME
```

### Step 8.2: Add Custom Domain to Frontend (Static Web Apps)

```bash
FRONTEND_DOMAIN="quizcrafter.yourdomain.com"

# Add custom domain
az staticwebapp hostname set \
  --name quizcrafter-prod-frontend \
  --resource-group quizcrafter-prod-rg \
  --hostname $FRONTEND_DOMAIN

# Add DNS CNAME record pointing to the default hostname
# After DNS propagation, SSL will be automatically configured
```

### Step 8.3: Update Canvas OAuth Redirect URI

Update your Canvas LMS developer application with the new redirect URI:

```
https://api.quizcrafter.yourdomain.com/api/v1/auth/canvas/callback
```

Update the Key Vault secret:

```bash
az keyvault secret set --vault-name $KEY_VAULT_NAME \
  --name "canvas-redirect-uri" \
  --value "https://api.quizcrafter.yourdomain.com/api/v1/auth/canvas/callback"
```

### Step 8.4: Update CORS Configuration

Update the backend to allow requests from your custom frontend domain:

```bash
# Add environment variable
az containerapp update \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --set-env-vars \
    BACKEND_CORS_ORIGINS="https://quizcrafter.yourdomain.com,https://www.quizcrafter.yourdomain.com"
```

---

## Phase 9: CI/CD Pipeline Setup

### Step 9.1: Add GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Value |
|-------------|-------|
| `AZURE_CREDENTIALS` | Service principal JSON from Phase 1 |
| `ACR_LOGIN_SERVER` | `quizcrafteracr.azurecr.io` |
| `ACR_USERNAME` | ACR admin username |
| `ACR_PASSWORD` | ACR admin password |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` | SWA deployment token |
| `POSTGRES_PASSWORD` | Database password (for migrations) |

### Step 9.2: Create Deployment Workflow

Create `.github/workflows/deploy-prod.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_CONTAINER_REGISTRY: ${{ secrets.ACR_LOGIN_SERVER }}
  BACKEND_IMAGE: ${{ secrets.ACR_LOGIN_SERVER }}/quizcrafter-backend
  RESOURCE_GROUP: quizcrafter-prod-rg
  CONTAINER_APP_NAME: quizcrafter-prod-backend

jobs:
  # Job 1: Run tests
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

      - name: Run linting
        run: uv run bash scripts/lint.sh
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

  # Job 2: Build and push backend image
  build-backend:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ github.sha }}

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure Container Registry
        uses: azure/docker-login@v2
        with:
          login-server: ${{ env.AZURE_CONTAINER_REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and push backend image
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.BACKEND_IMAGE }}:${{ github.sha }}
            ${{ env.BACKEND_IMAGE }}:latest

  # Job 3: Deploy backend
  deploy-backend:
    needs: build-backend
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Container Apps
        uses: azure/container-apps-deploy-action@v2
        with:
          resourceGroup: ${{ env.RESOURCE_GROUP }}
          containerAppName: ${{ env.CONTAINER_APP_NAME }}
          imageToDeploy: ${{ env.BACKEND_IMAGE }}:${{ github.sha }}

  # Job 4: Deploy frontend
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Build frontend
        run: npm run build
        working-directory: frontend
        env:
          VITE_API_URL: https://api.quizcrafter.yourdomain.com

      - name: Deploy to Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_PROD }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: frontend
          output_location: dist
          skip_app_build: true
```

### Step 9.3: Create Staging Deployment Workflow

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop, "release/*"]
  pull_request:
    branches: [main]
    types: [opened, synchronize]

env:
  AZURE_CONTAINER_REGISTRY: ${{ secrets.ACR_LOGIN_SERVER }}
  BACKEND_IMAGE: ${{ secrets.ACR_LOGIN_SERVER }}/quizcrafter-backend
  RESOURCE_GROUP: quizcrafter-staging-rg
  CONTAINER_APP_NAME: quizcrafter-staging-backend

jobs:
  test:
    # Same as production workflow
    runs-on: ubuntu-latest
    # ... (same steps as production)

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Log in to ACR
        uses: azure/docker-login@v2
        with:
          login-server: ${{ env.AZURE_CONTAINER_REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and push backend
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: true
          tags: ${{ env.BACKEND_IMAGE }}:staging-${{ github.sha }}

      - name: Deploy backend to staging
        uses: azure/container-apps-deploy-action@v2
        with:
          resourceGroup: ${{ env.RESOURCE_GROUP }}
          containerAppName: ${{ env.CONTAINER_APP_NAME }}
          imageToDeploy: ${{ env.BACKEND_IMAGE }}:staging-${{ github.sha }}

      # Frontend deployment
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          VITE_API_URL: https://api-staging.quizcrafter.yourdomain.com

      - name: Deploy frontend to staging
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING }}
          action: upload
          app_location: frontend
          output_location: dist
          skip_app_build: true
```

### Step 9.4: Configure GitHub Environment Protection

1. Go to your repository Settings > Environments
2. Create environments: `development`, `staging`, `production`
3. For `production`:
   - Add required reviewers
   - Set wait timer (optional, e.g., 5 minutes)
   - Restrict to `main` branch only

---

## Phase 10: Monitoring and Observability

### Step 10.1: Configure Log Analytics Queries

Access Log Analytics in Azure Portal and save these useful queries:

**Application Errors:**
```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "ERROR" or Log_s contains "Exception"
| project TimeGenerated, ContainerAppName_s, Log_s
| order by TimeGenerated desc
| take 100
```

**API Request Latency:**
```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "request_completed"
| parse Log_s with * '"duration":' duration:double *
| summarize avg(duration), percentile(duration, 95), percentile(duration, 99) by bin(TimeGenerated, 5m)
| render timechart
```

**Quiz Generation Metrics:**
```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "quiz_generation"
| summarize count() by bin(TimeGenerated, 1h)
| render timechart
```

### Step 10.2: Create Alert Rules

```bash
# Alert: High error rate
az monitor metrics alert create \
  --name "HighErrorRate" \
  --resource-group quizcrafter-prod-rg \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/quizcrafter-prod-rg/providers/Microsoft.App/containerApps/quizcrafter-prod-backend" \
  --condition "avg Requests where ResponseCodeClass == 5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2

# Alert: High CPU usage
az monitor metrics alert create \
  --name "HighCPU" \
  --resource-group quizcrafter-prod-rg \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/quizcrafter-prod-rg/providers/Microsoft.App/containerApps/quizcrafter-prod-backend" \
  --condition "avg UsageNanoCores > 800000000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3
```

### Step 10.3: Deploy Grafana (Optional)

If you want to keep using Grafana for custom dashboards:

```bash
# Create Grafana Container App
az containerapp create \
  --name quizcrafter-prod-grafana \
  --resource-group quizcrafter-prod-rg \
  --environment quizcrafter-prod-env \
  --image grafana/grafana:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    GF_SECURITY_ADMIN_PASSWORD=secretref:grafana-admin-password \
    GF_SERVER_ROOT_URL=https://grafana.quizcrafter.yourdomain.com
```

Configure Azure Monitor data source in Grafana:
1. Go to Configuration > Data Sources
2. Add "Azure Monitor" data source
3. Configure with your subscription details
4. Use managed identity authentication

---

## Post-Migration Validation

### Functional Checklist

Run through these tests to verify the migration:

```bash
# 1. Health check
curl https://api.quizcrafter.yourdomain.com/api/v1/utils/health-check/

# 2. Frontend loads
curl -I https://quizcrafter.yourdomain.com

# 3. Database connectivity (via API)
curl https://api.quizcrafter.yourdomain.com/api/v1/users/ \
  -H "Authorization: Bearer <token>"
```

### Manual Testing Checklist

- [ ] Canvas OAuth login works
- [ ] Course list loads correctly
- [ ] Quiz creation flow completes
- [ ] Question generation works (test with a small module)
- [ ] Question approval/rejection works
- [ ] Export to Canvas completes successfully
- [ ] User profile displays correctly

### Performance Validation

- [ ] API response times < 2 seconds for typical operations
- [ ] Frontend loads in < 3 seconds
- [ ] Quiz generation completes within expected timeframe
- [ ] No connection pool exhaustion errors

### Security Validation

- [ ] All traffic uses HTTPS
- [ ] Secrets are in Key Vault, not environment variables
- [ ] CORS is properly configured
- [ ] No secrets exposed in logs

---

## Troubleshooting

### Common Issues

#### 1. Container App Won't Start

```bash
# Check container logs
az containerapp logs show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --follow

# Check revision status
az containerapp revision list \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --output table
```

#### 2. Database Connection Fails

```bash
# Test connectivity from Cloud Shell
az postgres flexible-server connect \
  --name quizcrafter-prod-db \
  --admin-user quizcrafteradmin \
  --admin-password 'YourPassword'

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group quizcrafter-prod-rg \
  --name quizcrafter-prod-db \
  --output table
```

#### 3. Key Vault Access Denied

```bash
# Check role assignments
az role assignment list \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/quizcrafter-prod-rg/providers/Microsoft.KeyVault/vaults/quizcrafter-prod-kv" \
  --output table

# Verify managed identity
az containerapp identity show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg
```

#### 4. Static Web App 404 Errors

Ensure your `staticwebapp.config.json` includes SPA routing:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*", "/js/*", "/api/*"]
  }
}
```

#### 5. Canvas OAuth Redirect Mismatch

Verify these match exactly:
1. Redirect URI in Canvas developer settings
2. `CANVAS_REDIRECT_URI` environment variable in Container App
3. Frontend OAuth callback handler

---

## Cost Management

### Monitor Spending

```bash
# Get current month cost for resource group
az consumption usage list \
  --start-date $(date -d "$(date +%Y-%m-01)" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[?contains(instanceId, 'quizcrafter-prod')].{Resource:instanceName, Cost:pretaxCost}" \
  --output table
```

### Set Up Budget Alerts

```bash
# Create a monthly budget with alerts
az consumption budget create \
  --budget-name "quizcrafter-monthly" \
  --amount 200 \
  --category Cost \
  --time-grain Monthly \
  --start-date $(date +%Y-%m-01) \
  --end-date 2030-12-31 \
  --resource-group quizcrafter-prod-rg
```

### Cost Optimization Tips

1. **Enable scale-to-zero** for non-production environments
2. **Use Reserved Instances** for production database (1-year commitment saves ~30%)
3. **Review Log Analytics retention** (30 days is usually sufficient)
4. **Stop development resources** when not in use

---

## Appendix: Environment Variables Reference

### Backend Container App

| Variable | Source | Description |
|----------|--------|-------------|
| `POSTGRES_SERVER` | Direct | Azure PostgreSQL FQDN |
| `POSTGRES_PORT` | Direct | `5432` |
| `POSTGRES_DB` | Direct | `quizcrafter` |
| `POSTGRES_USER` | Key Vault | Database admin username |
| `POSTGRES_PASSWORD` | Key Vault | Database admin password |
| `SECRET_KEY` | Key Vault | JWT signing key |
| `ENVIRONMENT` | Direct | `production` |
| `FRONTEND_HOST` | Direct | Frontend URL |
| `CANVAS_CLIENT_ID` | Key Vault | Canvas OAuth client ID |
| `CANVAS_CLIENT_SECRET` | Key Vault | Canvas OAuth client secret |
| `CANVAS_REDIRECT_URI` | Direct | OAuth callback URL |
| `CANVAS_BASE_URL` | Direct | Canvas instance URL |
| `AZURE_OPENAI_API_KEY` | Key Vault | Azure OpenAI key |
| `AZURE_OPENAI_ENDPOINT` | Direct | Azure OpenAI endpoint |
| `BACKEND_CORS_ORIGINS` | Direct | Allowed CORS origins |

### Frontend Build

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (set at build time) |

---

## Next Steps After Migration

1. **Decommission old infrastructure** after 7 days of stable operation
2. **Set up database backups verification** - periodically test restore
3. **Implement log rotation policy** in Log Analytics
4. **Review and optimize scaling rules** based on actual usage patterns
5. **Set up uptime monitoring** with Azure Application Insights or external service
