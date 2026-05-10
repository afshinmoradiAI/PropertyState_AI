// PropertyState AI — Azure Container Apps infrastructure
// Deploy with: az deployment group create --resource-group <rg> --template-file main.bicep --parameters main.bicepparam

@description('Azure region. australiaeast recommended for AU data residency.')
param location string = 'australiaeast'

@description('Short prefix used for all resource names (3-12 lowercase alphanumeric).')
@minLength(3)
@maxLength(12)
param appName string = 'propstate'

@description('Anthropic API key — stored as a Container Apps secret.')
@secure()
param anthropicApiKey string

@description('Backend container image reference (set by CI/CD after first push).')
param backendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Frontend container image reference (set by CI/CD after first push).')
param frontendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Claude model ID.')
param defaultModel string = 'claude-sonnet-4-6'

// ── Derived names ─────────────────────────────────────────────────────────────
var acrName       = '${appName}acr${uniqueString(resourceGroup().id)}'
var envName       = '${appName}-env'
var backendName   = '${appName}-backend'
var frontendName  = '${appName}-frontend'
var logWorkspace  = '${appName}-logs'

// ── Log Analytics (required by Container Apps) ────────────────────────────────
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logWorkspace
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ── Azure Container Registry ──────────────────────────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// ── Container Apps Environment ────────────────────────────────────────────────
resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

// ── Backend Container App ─────────────────────────────────────────────────────
resource backend 'Microsoft.App/containerApps@2024-03-01' = {
  name: backendName
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'http'
        // SSE requires no response buffering — Container Apps handles this natively
      }
      secrets: [
        { name: 'anthropic-api-key', value: anthropicApiKey }
        { name: 'acr-password',      value: acr.listCredentials().passwords[0].value }
      ]
      registries: [
        {
          server:           acr.properties.loginServer
          username:         acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name:  'backend'
          image: backendImage
          env: [
            { name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }
            { name: 'DEFAULT_MODEL',     value: defaultModel }
            // ALLOWED_ORIGINS updated by deploy.sh after frontend FQDN is known
            { name: 'ALLOWED_ORIGINS',   value: 'https://${frontendName}.${env.properties.defaultDomain}' }
          ]
          resources: {
            cpu:    json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/health', port: 8000 }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1   // Must be ≥1 to keep SSE connections alive
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '20' } }
          }
        ]
      }
    }
  }
}

// ── Frontend Container App ────────────────────────────────────────────────────
resource frontend 'Microsoft.App/containerApps@2024-03-01' = {
  name: frontendName
  location: location
  dependsOn: [ backend ]
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
      ]
      registries: [
        {
          server:           acr.properties.loginServer
          username:         acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name:  'frontend'
          image: frontendImage
          // NEXT_PUBLIC_API_URL is baked into the image at build time (see deploy.sh / CI)
          resources: {
            cpu:    json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output acrLoginServer  string = acr.properties.loginServer
output acrName         string = acr.name
output backendUrl      string = 'https://${backend.properties.configuration.ingress.fqdn}'
output frontendUrl     string = 'https://${frontend.properties.configuration.ingress.fqdn}'
output envDefaultDomain string = env.properties.defaultDomain
