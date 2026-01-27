# Azure Migration Quick Reference

Quick reference for common commands and configurations during the QuizCrafter Azure migration.

## Azure CLI Essentials

### Login & Subscription

```bash
# Login to Azure
az login

# List subscriptions
az account list --output table

# Set active subscription
az account set --subscription "Your Subscription Name"

# Show current context
az account show
```

### Resource Groups

```bash
# List resource groups
az group list --output table

# Create resource group
az group create --name quizcrafter-prod-rg --location norwayeast
```

## Container Registry (ACR)

```bash
# Login to ACR
az acr login --name quizcrafteracr

# Build and push image
docker build -t quizcrafteracr.azurecr.io/quizcrafter-backend:latest ./backend
docker push quizcrafteracr.azurecr.io/quizcrafter-backend:latest

# List images
az acr repository list --name quizcrafteracr --output table

# List tags
az acr repository show-tags --name quizcrafteracr --repository quizcrafter-backend
```

## Container Apps

```bash
# List apps
az containerapp list --resource-group quizcrafter-prod-rg --output table

# Show app details
az containerapp show --name quizcrafter-prod-backend --resource-group quizcrafter-prod-rg

# View logs (follow)
az containerapp logs show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --follow

# View logs (tail)
az containerapp logs show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --tail 100

# Restart app
az containerapp revision restart \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --revision <revision-name>

# Scale app
az containerapp update \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --min-replicas 1 \
  --max-replicas 4

# Update environment variable
az containerapp update \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --set-env-vars "KEY=value"

# Deploy new image
az containerapp update \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --image quizcrafteracr.azurecr.io/quizcrafter-backend:newtag
```

## PostgreSQL

```bash
# List servers
az postgres flexible-server list --output table

# Show server details
az postgres flexible-server show \
  --name quizcrafter-prod-db \
  --resource-group quizcrafter-prod-rg

# Connect via psql
psql "host=quizcrafter-prod-db.postgres.database.azure.com \
  port=5432 \
  dbname=quizcrafter \
  user=quizcrafteradmin \
  sslmode=require"

# Start/stop server (cost savings)
az postgres flexible-server stop \
  --name quizcrafter-dev-db \
  --resource-group quizcrafter-dev-rg

az postgres flexible-server start \
  --name quizcrafter-dev-db \
  --resource-group quizcrafter-dev-rg

# Show firewall rules
az postgres flexible-server firewall-rule list \
  --name quizcrafter-prod-db \
  --resource-group quizcrafter-prod-rg \
  --output table
```

## Key Vault

```bash
# List secrets
az keyvault secret list --vault-name quizcrafter-prod-kv --output table

# Get secret value
az keyvault secret show \
  --vault-name quizcrafter-prod-kv \
  --name secret-key \
  --query value -o tsv

# Set secret
az keyvault secret set \
  --vault-name quizcrafter-prod-kv \
  --name "new-secret" \
  --value "secret-value"

# Delete secret
az keyvault secret delete \
  --vault-name quizcrafter-prod-kv \
  --name "old-secret"
```

## Static Web Apps

```bash
# List apps
az staticwebapp list --output table

# Show app details
az staticwebapp show \
  --name quizcrafter-prod-frontend \
  --resource-group quizcrafter-prod-rg

# Get deployment token
az staticwebapp secrets list \
  --name quizcrafter-prod-frontend \
  --resource-group quizcrafter-prod-rg

# Add custom domain
az staticwebapp hostname set \
  --name quizcrafter-prod-frontend \
  --hostname quizcrafter.yourdomain.com
```

## Log Analytics

```bash
# Query logs (last hour errors)
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "ContainerAppConsoleLogs_CL | where Log_s contains 'ERROR' | take 50"
```

## Monitoring & Alerts

```bash
# List alerts
az monitor metrics alert list \
  --resource-group quizcrafter-prod-rg \
  --output table

# Get container app metrics
az monitor metrics list \
  --resource "/subscriptions/<sub>/resourceGroups/quizcrafter-prod-rg/providers/Microsoft.App/containerApps/quizcrafter-prod-backend" \
  --metric "Requests" \
  --interval PT1H
```

## Bicep Deployments

```bash
# Deploy infrastructure
az deployment group create \
  --name "deployment-$(date +%Y%m%d%H%M)" \
  --resource-group quizcrafter-prod-rg \
  --template-file infrastructure/environments/prod/main.bicep \
  --parameters @infrastructure/environments/prod/parameters.json

# What-if (preview changes)
az deployment group what-if \
  --resource-group quizcrafter-prod-rg \
  --template-file infrastructure/environments/prod/main.bicep

# Show deployment outputs
az deployment group show \
  --name "deployment-name" \
  --resource-group quizcrafter-prod-rg \
  --query properties.outputs
```

---

## Connection Strings

### PostgreSQL Connection String

```
postgresql://quizcrafteradmin:PASSWORD@quizcrafter-prod-db.postgres.database.azure.com:5432/quizcrafter?sslmode=require
```

### Key Vault Secret Reference (Container Apps)

```yaml
secrets:
  - name: db-password
    keyVaultUrl: https://quizcrafter-prod-kv.vault.azure.net/secrets/postgres-password
    identity: system
```

---

## GitHub Secrets Required

| Secret Name | Description |
|-------------|-------------|
| `AZURE_CLIENT_ID` | Microsoft Entra Application (client) ID for OIDC |
| `AZURE_TENANT_ID` | Azure AD tenant ID for OIDC |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID for OIDC |
| `ACR_LOGIN_SERVER` | `quizcrafteracr.azurecr.io` |
| `ACR_USERNAME` | Container registry username |
| `ACR_PASSWORD` | Container registry password |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` | SWA deployment token (production) |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING` | SWA deployment token (staging) |
| `POSTGRES_PASSWORD` | Database admin password |

---

## Useful URLs

| Service | URL Pattern |
|---------|-------------|
| Backend API | `https://quizcrafter-prod-backend.<random>.norwayeast.azurecontainerapps.io` |
| Frontend | `https://quizcrafter-prod-frontend.<random>.azurestaticapps.net` |
| Azure Portal | `https://portal.azure.com` |
| Container Apps Console | Portal > Container Apps > quizcrafter-prod-backend > Console |
| Log Analytics | Portal > Log Analytics workspaces > quizcrafter-prod-logs |

---

## Troubleshooting Commands

```bash
# Check if container app is running
az containerapp show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --query "properties.runningStatus"

# List revisions and their status
az containerapp revision list \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg \
  --output table

# Check managed identity
az containerapp identity show \
  --name quizcrafter-prod-backend \
  --resource-group quizcrafter-prod-rg

# Check Key Vault access
az role assignment list \
  --scope "/subscriptions/<sub>/resourceGroups/quizcrafter-prod-rg/providers/Microsoft.KeyVault/vaults/quizcrafter-prod-kv" \
  --output table

# Test database connectivity
az postgres flexible-server connect \
  --name quizcrafter-prod-db \
  --admin-user quizcrafteradmin \
  --admin-password "PASSWORD" \
  --database-name quizcrafter
```
