// Azure App Service Backend Module
// Deploys a containerized Python/FastAPI backend with managed identity

@description('Name of the App Service')
param appName string

@description('Location for the App Service')
param location string = resourceGroup().location

@description('App Service Plan ID')
param appServicePlanId string

@description('Container image (full path including registry)')
param containerImage string

@description('Container Registry URL (https://...)')
param containerRegistryUrl string

@description('Container Registry username')
param containerRegistryUsername string

@description('Container Registry password')
@secure()
param containerRegistryPassword string

@description('Key Vault name for secret references')
param keyVaultName string

@description('Log Analytics workspace ID for diagnostics')
param logAnalyticsWorkspaceId string

@description('PostgreSQL server FQDN')
param postgresServer string

@description('PostgreSQL database name')
param postgresDatabase string

@description('PostgreSQL username')
param postgresUser string

@description('Frontend URL for CORS configuration')
param frontendUrl string

@description('Enable always-on (keeps app warm)')
param alwaysOn bool = true

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
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerImage}'
      alwaysOn: alwaysOn
      ftpsState: 'Disabled'
      http20Enabled: true
      minTlsVersion: '1.2'
      healthCheckPath: '/utils/health-check/'
      appSettings: [
        // Container Registry configuration
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: containerRegistryUrl
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: containerRegistryUsername
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: containerRegistryPassword
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        // Application configuration
        {
          name: 'POSTGRES_SERVER'
          value: postgresServer
        }
        {
          name: 'POSTGRES_PORT'
          value: '5432'
        }
        {
          name: 'POSTGRES_DB'
          value: postgresDatabase
        }
        {
          name: 'POSTGRES_USER'
          value: postgresUser
        }
        {
          name: 'ENVIRONMENT'
          value: 'production'
        }
        {
          name: 'PROJECT_NAME'
          value: 'QuizCrafter'
        }
        {
          name: 'FRONTEND_HOST'
          value: frontendUrl
        }
        // Key Vault secret references (configured after managed identity is set up)
        // These use the format: @Microsoft.KeyVault(VaultName=...;SecretName=...)
        {
          name: 'SECRET_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=SECRET-KEY)'
        }
        {
          name: 'POSTGRES_PASSWORD'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=POSTGRES-PASSWORD)'
        }
        {
          name: 'CANVAS_CLIENT_ID'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CANVAS-CLIENT-ID)'
        }
        {
          name: 'CANVAS_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CANVAS-CLIENT-SECRET)'
        }
        {
          name: 'CANVAS_BASE_URL'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CANVAS-BASE-URL)'
        }
        {
          name: 'CANVAS_REDIRECT_URI'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CANVAS-REDIRECT-URI)'
        }
        {
          name: 'AZURE_OPENAI_API_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-OPENAI-API-KEY)'
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-OPENAI-ENDPOINT)'
        }
        {
          name: 'AZURE_OPENAI_API_VERSION'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-OPENAI-API-VERSION)'
        }
      ]
    }
  }
}

// Configure diagnostic settings for Log Analytics
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '${appName}-diagnostics'
  scope: appService
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output appUrl string = 'https://${appService.properties.defaultHostName}'
output appName string = appService.name
output principalId string = appService.identity.principalId
output defaultHostName string = appService.properties.defaultHostName
