// QuizCrafter Test Environment Infrastructure
// Deploys to: p-qzcrft-test resource group

@description('Environment name')
param environment string = 'test'

@description('Application name prefix')
param appPrefix string = 'qzcrft'

@description('Location')
param location string = resourceGroup().location

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('Admin Object ID for Key Vault access (user or service principal)')
param adminObjectId string

@description('GitHub repository URL (optional)')
param repositoryUrl string = ''

// Variables
var resourcePrefix = '${appPrefix}-${environment}'

// ============================================
// Log Analytics
// ============================================
module logAnalytics '../../modules/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    workspaceName: '${resourcePrefix}-logs'
    location: location
    retentionInDays: 30
  }
}

// ============================================
// Key Vault
// ============================================
module keyVault '../../modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    keyVaultName: '${resourcePrefix}-kv'
    location: location
    adminObjectId: adminObjectId
    enableSoftDelete: true
  }
}

// ============================================
// PostgreSQL
// ============================================
module postgresql '../../modules/postgresql.bicep' = {
  name: 'postgresql'
  params: {
    serverName: '${resourcePrefix}-db'
    location: location
    administratorLogin: 'quizcrafteradmin'
    administratorPassword: postgresAdminPassword
    databaseName: 'quizcrafter'
    skuName: 'Standard_B1ms'  // Burstable tier for test
    storageSizeGB: 32
  }
}

// ============================================
// Container Registry
// ============================================
module containerRegistry '../../modules/container-registry.bicep' = {
  name: 'containerRegistry'
  params: {
    registryName: '${appPrefix}testacr'  // Must be globally unique, alphanumeric only
    location: location
    sku: 'Basic'
  }
}

// ============================================
// Container Apps Environment
// ============================================
module containerAppsEnv '../../modules/container-apps-env.bicep' = {
  name: 'containerAppsEnv'
  params: {
    environmentName: '${resourcePrefix}-env'
    location: location
    logAnalyticsCustomerId: logAnalytics.outputs.customerId
    logAnalyticsSharedKey: logAnalytics.outputs.sharedKey
  }
}

// ============================================
// Static Web App (Frontend)
// ============================================
module staticWebApp '../../modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    appName: '${resourcePrefix}-frontend'
    location: location
    repositoryUrl: repositoryUrl
    sku: 'Free'
  }
}

// ============================================
// Outputs
// ============================================
output logAnalyticsWorkspaceId string = logAnalytics.outputs.workspaceId
output logAnalyticsWorkspaceName string = logAnalytics.outputs.workspaceName
output keyVaultUri string = keyVault.outputs.keyVaultUri
output keyVaultName string = keyVault.outputs.keyVaultName
output postgresServerFqdn string = postgresql.outputs.serverFqdn
output postgresServerName string = postgresql.outputs.serverName
output postgresDatabaseName string = postgresql.outputs.databaseName
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output containerRegistryName string = containerRegistry.outputs.registryName
output containerAppsEnvironmentId string = containerAppsEnv.outputs.environmentId
output containerAppsEnvironmentName string = containerAppsEnv.outputs.environmentName
output containerAppsDefaultDomain string = containerAppsEnv.outputs.defaultDomain
output staticWebAppHostname string = staticWebApp.outputs.defaultHostname
output staticWebAppName string = staticWebApp.outputs.appName
