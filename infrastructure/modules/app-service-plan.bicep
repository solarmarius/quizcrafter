// Azure App Service Plan Module
// Provides compute resources for App Service applications

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
