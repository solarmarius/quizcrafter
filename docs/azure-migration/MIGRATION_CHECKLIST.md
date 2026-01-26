# Azure Migration Checklist

Use this checklist to track progress during the QuizCrafter Azure migration.

## Pre-Migration

### Planning
- [ ] Review current infrastructure and dependencies
- [ ] Estimate Azure costs for all environments
- [ ] Get Azure subscription with appropriate permissions
- [ ] Plan maintenance window for production cutover
- [ ] Communicate migration plan to stakeholders

### Prerequisites
- [ ] Install Azure CLI (`az --version`)
- [ ] Install GitHub CLI (`gh --version`)
- [ ] Login to Azure (`az login`)
- [ ] Verify subscription access (`az account show`)

---

## Phase 1: Azure Foundation

### Resource Groups
- [ ] Create `quizcrafter-dev-rg`
- [ ] Create `quizcrafter-staging-rg`
- [ ] Create `quizcrafter-prod-rg`
- [ ] Create `quizcrafter-shared-rg`

### Service Principal
- [ ] Create service principal for GitHub Actions
- [ ] Save credentials JSON securely
- [ ] Add `AZURE_CREDENTIALS` to GitHub secrets

### Resource Providers
- [ ] Register `Microsoft.App`
- [ ] Register `Microsoft.ContainerRegistry`
- [ ] Register `Microsoft.DBforPostgreSQL`
- [ ] Register `Microsoft.KeyVault`
- [ ] Register `Microsoft.OperationalInsights`
- [ ] Register `Microsoft.Web`

---

## Phase 2: Infrastructure as Code

### Bicep Modules
- [ ] Create `infrastructure/` directory structure
- [ ] Create `log-analytics.bicep` module
- [ ] Create `key-vault.bicep` module
- [ ] Create `postgresql.bicep` module
- [ ] Create `container-registry.bicep` module
- [ ] Create `container-apps-env.bicep` module
- [ ] Create `container-app.bicep` module
- [ ] Create `static-web-app.bicep` module

### Environment Configurations
- [ ] Create `environments/dev/main.bicep`
- [ ] Create `environments/dev/parameters.json`
- [ ] Create `environments/staging/main.bicep`
- [ ] Create `environments/staging/parameters.json`
- [ ] Create `environments/prod/main.bicep`
- [ ] Create `environments/prod/parameters.json`

### Deployment Testing
- [ ] Deploy to development environment
- [ ] Verify all resources created correctly
- [ ] Test infrastructure destroy/recreate

---

## Phase 3: Container Registry

### Setup
- [ ] Create Azure Container Registry (shared)
- [ ] Get ACR credentials
- [ ] Add `ACR_LOGIN_SERVER` to GitHub secrets
- [ ] Add `ACR_USERNAME` to GitHub secrets
- [ ] Add `ACR_PASSWORD` to GitHub secrets

### Image Build
- [ ] Build backend Docker image locally
- [ ] Push to ACR with `latest` tag
- [ ] Push with commit SHA tag
- [ ] Verify image in registry

---

## Phase 4: Database Migration

### Development Environment
- [ ] Create PostgreSQL Flexible Server (dev)
- [ ] Configure PgBouncer
- [ ] Add firewall rules
- [ ] Test connectivity
- [ ] Run Alembic migrations
- [ ] Verify schema

### Staging Environment
- [ ] Create PostgreSQL Flexible Server (staging)
- [ ] Configure PgBouncer
- [ ] Add firewall rules
- [ ] Copy data from dev or create test data
- [ ] Run Alembic migrations
- [ ] Verify schema

### Production Environment
- [ ] Create PostgreSQL Flexible Server (prod)
- [ ] Configure PgBouncer
- [ ] Add firewall rules
- [ ] Export data from current database (`pg_dump`)
- [ ] Import data to Azure PostgreSQL (`pg_restore`)
- [ ] Verify row counts match
- [ ] Run any pending migrations
- [ ] Verify application data integrity

---

## Phase 5: Key Vault

### Development
- [ ] Create Key Vault (dev)
- [ ] Add all required secrets
- [ ] Configure RBAC access

### Staging
- [ ] Create Key Vault (staging)
- [ ] Add all required secrets
- [ ] Configure RBAC access

### Production
- [ ] Create Key Vault (prod)
- [ ] Add `postgres-password`
- [ ] Add `postgres-user`
- [ ] Add `secret-key`
- [ ] Add `first-superuser-password`
- [ ] Add `canvas-client-id`
- [ ] Add `canvas-client-secret`
- [ ] Add `azure-openai-api-key`
- [ ] Add `grafana-admin-password` (if using Grafana)
- [ ] Configure RBAC access

---

## Phase 6: Container Apps

### Development
- [ ] Create Container Apps Environment (dev)
- [ ] Deploy backend Container App
- [ ] Configure Key Vault secret references
- [ ] Configure environment variables
- [ ] Test health endpoint
- [ ] Test API endpoints

### Staging
- [ ] Create Container Apps Environment (staging)
- [ ] Deploy backend Container App
- [ ] Configure Key Vault secret references
- [ ] Configure environment variables
- [ ] Test health endpoint
- [ ] Test full application flow

### Production
- [ ] Create Container Apps Environment (prod)
- [ ] Deploy backend Container App
- [ ] Configure Key Vault secret references
- [ ] Configure environment variables
- [ ] Configure scaling (0-4 replicas)
- [ ] Test health endpoint
- [ ] Verify all API endpoints work

---

## Phase 7: Static Web Apps (Frontend)

### Development
- [ ] Create Static Web App (dev)
- [ ] Get deployment token
- [ ] Build frontend with dev API URL
- [ ] Deploy to Static Web App
- [ ] Test frontend loads
- [ ] Test API connectivity

### Staging
- [ ] Create Static Web App (staging)
- [ ] Get deployment token
- [ ] Add `AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING` to GitHub secrets
- [ ] Build frontend with staging API URL
- [ ] Deploy to Static Web App
- [ ] Test full user flow

### Production
- [ ] Create Static Web App (prod)
- [ ] Get deployment token
- [ ] Add `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` to GitHub secrets
- [ ] Build frontend with production API URL
- [ ] Deploy to Static Web App
- [ ] Test full user flow

---

## Phase 8: Custom Domains & SSL

### Backend (Container Apps)
- [ ] Add custom domain to staging backend
- [ ] Configure DNS CNAME record (staging)
- [ ] Verify SSL certificate (staging)
- [ ] Add custom domain to production backend
- [ ] Configure DNS CNAME record (production)
- [ ] Configure DNS TXT record for verification
- [ ] Verify SSL certificate (production)

### Frontend (Static Web Apps)
- [ ] Add custom domain to staging frontend
- [ ] Configure DNS CNAME record (staging)
- [ ] Verify SSL certificate (staging)
- [ ] Add custom domain to production frontend
- [ ] Configure DNS CNAME record (production)
- [ ] Verify SSL certificate (production)

### Canvas OAuth
- [ ] Update Canvas redirect URI in developer settings
- [ ] Update `CANVAS_REDIRECT_URI` in Key Vault
- [ ] Test OAuth login flow

### CORS
- [ ] Update `BACKEND_CORS_ORIGINS` with custom domains
- [ ] Test cross-origin requests

---

## Phase 9: CI/CD Pipelines

### GitHub Workflows
- [ ] Create `.github/workflows/deploy-prod.yml`
- [ ] Create `.github/workflows/deploy-staging.yml`
- [ ] Create `.github/workflows/infrastructure.yml`

### GitHub Environments
- [ ] Create `development` environment
- [ ] Create `staging` environment
- [ ] Create `production` environment
- [ ] Configure production protection rules (reviewers)
- [ ] Configure branch restrictions

### Testing Pipelines
- [ ] Test staging deployment workflow
- [ ] Test production deployment workflow
- [ ] Test infrastructure deployment workflow
- [ ] Verify rollback capability

---

## Phase 10: Monitoring

### Log Analytics
- [ ] Verify logs flowing from Container Apps
- [ ] Create saved queries for common issues
- [ ] Set up log retention policy

### Alerts
- [ ] Create alert: High error rate (5xx > 5%)
- [ ] Create alert: High CPU usage (> 80%)
- [ ] Create alert: High memory usage (> 85%)
- [ ] Create alert: Database connection failures
- [ ] Configure alert notification channels (email/Slack)

### Grafana (Optional)
- [ ] Deploy Grafana Container App
- [ ] Configure Azure Monitor data source
- [ ] Migrate existing dashboards
- [ ] Set up custom domain

### Budget Alerts
- [ ] Create monthly budget
- [ ] Configure alerts at 50%, 80%, 100% threshold

---

## Post-Migration Validation

### Functional Testing
- [ ] Canvas OAuth login works
- [ ] Course list loads correctly
- [ ] Quiz creation completes
- [ ] Question generation works
- [ ] Question approval/rejection works
- [ ] Export to Canvas works
- [ ] User profile displays correctly

### Performance Testing
- [ ] API response times < 2 seconds
- [ ] Frontend loads < 3 seconds
- [ ] Quiz generation completes in expected time
- [ ] No database connection errors

### Security Verification
- [ ] All endpoints use HTTPS
- [ ] No secrets in environment variables (all from Key Vault)
- [ ] CORS properly configured
- [ ] No sensitive data in logs

### Operational Verification
- [ ] CI/CD deploys successfully
- [ ] Logs appear in Log Analytics
- [ ] Alerts fire correctly (test alert)
- [ ] Scale-to-zero works
- [ ] Scale-out works under load

---

## Cutover & Cleanup

### DNS Cutover
- [ ] Update DNS to point to Azure (if using same domain)
- [ ] Monitor for DNS propagation
- [ ] Verify all traffic routing to Azure

### Old Infrastructure
- [ ] Keep old infrastructure running for 7 days (rollback)
- [ ] Monitor for any issues
- [ ] After 7 days stable: decommission old server
- [ ] Delete old database backups after 30 days

### Documentation
- [ ] Update CLAUDE.md with new deployment commands
- [ ] Update README with Azure setup instructions
- [ ] Document runbook for common operations
- [ ] Train team on new deployment process

---

## Sign-off

| Phase | Completed | Date | Notes |
|-------|-----------|------|-------|
| Pre-Migration | [ ] | | |
| Azure Foundation | [ ] | | |
| Infrastructure as Code | [ ] | | |
| Container Registry | [ ] | | |
| Database Migration | [ ] | | |
| Key Vault | [ ] | | |
| Container Apps | [ ] | | |
| Static Web Apps | [ ] | | |
| Custom Domains | [ ] | | |
| CI/CD Pipelines | [ ] | | |
| Monitoring | [ ] | | |
| Validation | [ ] | | |
| Cutover | [ ] | | |

**Migration Completed:** ____________

**Signed off by:** ____________
