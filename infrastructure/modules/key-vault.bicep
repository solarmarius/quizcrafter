@description('Name of the Key Vault')
param keyVaultName string

@description('Location for the Key Vault')
param location string = resourceGroup().location

@description('Object ID of the admin to grant access')
param adminObjectId string

@description('Tenant ID')
param tenantId string = subscription().tenantId

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
    tenantId: tenantId
    enableRbacAuthorization: false  // Use access policies instead of RBAC
    enableSoftDelete: enableSoftDelete
    softDeleteRetentionInDays: 7
    // Note: enablePurgeProtection omitted (defaults to null for new vaults, set to true for production)
    accessPolicies: [
      {
        tenantId: tenantId
        objectId: adminObjectId
        permissions: {
          keys: ['all']
          secrets: ['all']
          certificates: ['all']
        }
      }
    ]
  }
}

output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultName string = keyVault.name
output keyVaultId string = keyVault.id
