// QuizCrafter Test Environment Infrastructure - App Service Architecture
// Deploys to: p-qzcrft-test-appservice resource group
//
// This template deploys App Services and REUSES existing resources from p-qzcrft-test:
// - [REUSE] Key Vault from p-qzcrft-test
// - [REUSE] PostgreSQL Flexible Server from p-qzcrft-test
// - [REUSE] Container Registry from p-qzcrft-test
// - [NEW] Log Analytics workspace
// - [NEW] App Service Plan (shared by frontend and backend)
// - [NEW] Backend App Service (Python/FastAPI container)
// - [NEW] Frontend App Service (Node.js serving React SPA)

@description('Environment name')
param environment string = 'test'

@description('Application name prefix')
param appPrefix string = 'qzcrft'

@description('Location')
param location string = resourceGroup().location

@description('App Service Plan SKU')
param appServicePlanSku string = 'B1'

@description('App Service Plan tier')
param appServicePlanTier string = 'Basic'

@description('Existing resource group containing shared resources')
param existingResourceGroup string = 'p-qzcrft-test'

// Variables
var resourcePrefix = '${appPrefix}-${environment}'

// Existing resource names in p-qzcrft-test
var existingKeyVaultName = '${resourcePrefix}-kv'
var existingPostgresServerName = '${resourcePrefix}-db'
var existingContainerRegistryName = '${appPrefix}${environment}acr'

// ============================================
// Reference to existing Container Registry (for credentials)
// ============================================
resource existingAcr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: existingContainerRegistryName
  scope: resourceGroup(existingResourceGroup)
}

// ============================================
// Log Analytics (new in this resource group)
// ============================================
module logAnalytics '../../modules/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    workspaceName: '${resourcePrefix}-appservice-logs'
    location: location
    retentionInDays: 30
  }
}

// ============================================
// App Service Plan (shared by both apps)
// ============================================
module appServicePlan '../../modules/app-service-plan.bicep' = {
  name: 'appServicePlan'
  params: {
    planName: '${resourcePrefix}-appservice-plan'
    location: location
    skuName: appServicePlanSku
    skuTier: appServicePlanTier
  }
}

// ============================================
// Backend App Service
// ============================================
module backendAppService '../../modules/app-service-backend.bicep' = {
  name: 'backendAppService'
  params: {
    appName: '${resourcePrefix}-api'
    location: location
    appServicePlanId: appServicePlan.outputs.planId
    containerImage: '${existingAcr.properties.loginServer}/quizcrafter-backend:latest'
    containerRegistryUrl: 'https://${existingAcr.properties.loginServer}'
    containerRegistryUsername: existingAcr.listCredentials().username
    containerRegistryPassword: existingAcr.listCredentials().passwords[0].value
    keyVaultName: existingKeyVaultName
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    postgresServer: '${existingPostgresServerName}.postgres.database.azure.com'
    postgresDatabase: 'quizcrafter'
    postgresUser: 'quizcrafteradmin'
    frontendUrl: 'https://${resourcePrefix}-web.azurewebsites.net'
  }
}

// ============================================
// Frontend App Service
// ============================================
module frontendAppService '../../modules/app-service-frontend.bicep' = {
  name: 'frontendAppService'
  params: {
    appName: '${resourcePrefix}-web'
    location: location
    appServicePlanId: appServicePlan.outputs.planId
    backendApiUrl: backendAppService.outputs.appUrl
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
  }
}

// ============================================
// Outputs
// ============================================
output logAnalyticsWorkspaceId string = logAnalytics.outputs.workspaceId
output logAnalyticsWorkspaceName string = logAnalytics.outputs.workspaceName
output existingKeyVaultName string = existingKeyVaultName
output existingPostgresServerFqdn string = '${existingPostgresServerName}.postgres.database.azure.com'
output existingContainerRegistryLoginServer string = existingAcr.properties.loginServer
output appServicePlanId string = appServicePlan.outputs.planId
output appServicePlanName string = appServicePlan.outputs.planName
output backendAppUrl string = backendAppService.outputs.appUrl
output backendAppName string = backendAppService.outputs.appName
output backendPrincipalId string = backendAppService.outputs.principalId
output frontendAppUrl string = frontendAppService.outputs.appUrl
output frontendAppName string = frontendAppService.outputs.appName
