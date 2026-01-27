# QuizCrafter Azure Infrastructure

This directory contains Bicep templates for deploying QuizCrafter to Azure.

## Directory Structure

```
infrastructure/
├── modules/                    # Reusable Bicep modules
│   ├── log-analytics.bicep     # Log Analytics workspace
│   ├── key-vault.bicep         # Azure Key Vault
│   ├── postgresql.bicep        # PostgreSQL Flexible Server
│   ├── container-registry.bicep # Azure Container Registry
│   ├── container-apps-env.bicep # Container Apps Environment
│   ├── container-app.bicep     # Container App (backend)
│   └── static-web-app.bicep    # Static Web App (frontend)
├── environments/
│   └── test/                   # Test environment
│       ├── main.bicep          # Main deployment file
│       └── parameters.json     # Parameters template
└── README.md
```

## Prerequisites

1. Azure CLI installed (`az --version`)
2. Logged in to Azure (`az login`)
3. OIDC authentication configured (see `/docs/azure-migration/AUDIT_TRAIL.md`)
4. Contributor role assigned to service principal

## Deploy to Test Environment

### Step 1: Get Required Values

```bash
# Get your user object ID (for Key Vault access)
ADMIN_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)

# Generate a secure password for PostgreSQL
POSTGRES_PASSWORD=$(openssl rand -base64 24)
echo "Save this password securely: $POSTGRES_PASSWORD"
```

### Step 2: Deploy Infrastructure

```bash
RESOURCE_GROUP="p-qzcrft-test"

az deployment group create \
  --name "quizcrafter-test-$(date +%Y%m%d%H%M)" \
  --resource-group $RESOURCE_GROUP \
  --template-file infrastructure/environments/test/main.bicep \
  --parameters \
    postgresAdminPassword="$POSTGRES_PASSWORD" \
    adminObjectId="$ADMIN_OBJECT_ID"
```

### Step 3: Get Deployment Outputs

```bash
az deployment group show \
  --name "quizcrafter-test-<deployment-name>" \
  --resource-group $RESOURCE_GROUP \
  --query properties.outputs
```

## What Gets Deployed

| Resource | Name | Purpose |
|----------|------|---------|
| Log Analytics | qzcrft-test-logs | Centralized logging |
| Key Vault | qzcrft-test-kv | Secrets management |
| PostgreSQL | qzcrft-test-db | Database |
| Container Registry | qzcfttestacr | Docker images |
| Container Apps Env | qzcrft-test-env | Container hosting |
| Static Web App | qzcrft-test-frontend | Frontend hosting |

## After Deployment

1. **Add secrets to Key Vault** (see Phase 5 in migration guide)
2. **Build and push Docker image to ACR** (see Phase 4)
3. **Deploy Container App** (see Phase 6)
4. **Deploy frontend** (see Phase 7)

## Cleanup

To delete all resources:

```bash
az group delete --name p-qzcrft-test --yes --no-wait
```

**Warning:** This will delete everything in the resource group!

## Related Documentation

- [Azure Migration Guide](/docs/azure-migration/AZURE_MIGRATION_GUIDE.md)
- [Audit Trail](/docs/azure-migration/AUDIT_TRAIL.md)
- [Quick Reference](/docs/azure-migration/QUICK_REFERENCE.md)
