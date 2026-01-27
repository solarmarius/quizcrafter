@description('Name of the Container App')
param appName string

@description('Location for the app')
param location string = resourceGroup().location

@description('Container Apps Environment ID')
param environmentId string

@description('Container image to deploy')
param containerImage string

@description('Container Registry login server')
param registryLoginServer string

@description('Container Registry username')
param registryUsername string

@description('Container Registry password')
@secure()
param registryPassword string

@description('Key Vault URI')
param keyVaultUri string

@description('Environment variables (non-sensitive)')
param envVars array = []

@description('Secrets from Key Vault')
param keyVaultSecrets array = []

@description('Minimum replicas')
param minReplicas int = 0

@description('Maximum replicas')
param maxReplicas int = 4

@description('CPU cores')
param cpu string = '0.5'

@description('Memory')
param memory string = '1Gi'

@description('Enable external ingress')
param externalIngress bool = true

@description('Target port')
param targetPort int = 8000

// Create user-assigned managed identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${appName}-identity'
  location: location
}

// Create the Container App
resource containerApp 'Microsoft.App/containerApps@2023-11-02-preview' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: externalIngress ? {
        external: true
        targetPort: targetPort
        transport: 'http'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      } : null
      registries: [
        {
          server: registryLoginServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: concat([
        {
          name: 'registry-password'
          value: registryPassword
        }
      ], [for secret in keyVaultSecrets: {
        name: secret.name
        keyVaultUrl: '${keyVaultUri}secrets/${secret.keyVaultSecretName}'
        identity: managedIdentity.id
      }])
    }
    template: {
      containers: [
        {
          name: appName
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: concat(envVars, [for secret in keyVaultSecrets: {
            name: secret.envVarName
            secretRef: secret.name
          }])
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

output appUrl string = externalIngress ? 'https://${containerApp.properties.configuration.ingress.fqdn}' : ''
output appName string = containerApp.name
output managedIdentityPrincipalId string = managedIdentity.properties.principalId
output managedIdentityId string = managedIdentity.id
