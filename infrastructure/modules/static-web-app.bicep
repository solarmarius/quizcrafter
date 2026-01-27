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
