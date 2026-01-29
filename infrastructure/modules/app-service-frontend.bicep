// Azure App Service Frontend Module
// Deploys a Node.js App Service for serving React SPA with PM2

@description('Name of the App Service')
param appName string

@description('Location for the App Service')
param location string = resourceGroup().location

@description('App Service Plan ID')
param appServicePlanId string

@description('Backend API URL for the frontend to communicate with')
param backendApiUrl string

@description('Log Analytics workspace ID for diagnostics')
param logAnalyticsWorkspaceId string

@description('Enable always-on (keeps app warm)')
param alwaysOn bool = true

@description('Node.js version')
param nodeVersion string = '20-lts'

resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      alwaysOn: alwaysOn
      ftpsState: 'Disabled'
      http20Enabled: true
      minTlsVersion: '1.2'
      // PM2 serve command for SPA with client-side routing support
      appCommandLine: 'pm2 serve /home/site/wwwroot --no-daemon --spa'
      appSettings: [
        {
          name: 'VITE_API_URL'
          value: backendApiUrl
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'  // We deploy pre-built static files
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
output defaultHostName string = appService.properties.defaultHostName
