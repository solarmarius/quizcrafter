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
