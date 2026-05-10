#!/usr/bin/env bash
# PropertyState AI — one-shot Azure deployment
# Requirements: az CLI, docker (for local image builds)
# Usage:  bash azure/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── CONFIG — edit these ───────────────────────────────────────────────────────
APP_NAME="propstate"                    # 3-12 lowercase alphanumeric
RESOURCE_GROUP="propertystate-rg"
LOCATION="australiaeast"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY env var before running}"

# ─────────────────────────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
DEPLOYMENT_NAME="${APP_NAME}-deploy-$(date +%Y%m%d%H%M)"
IMAGE_TAG="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'latest')"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   PropertyState AI — Azure Deployment        ║"
echo "╚══════════════════════════════════════════════╝"
echo "  App name : $APP_NAME"
echo "  Region   : $LOCATION"
echo "  Tag      : $IMAGE_TAG"
echo ""

# ── 1. Login check ────────────────────────────────────────────────────────────
echo "▶ Checking Azure login..."
az account show --query name -o tsv || { echo "Run: az login"; exit 1; }

# ── 2. Resource group ─────────────────────────────────────────────────────────
echo "▶ Creating resource group '$RESOURCE_GROUP'..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# ── 3. Deploy Bicep (creates ACR + Container Apps env + placeholder apps) ─────
echo "▶ Deploying infrastructure (Bicep)..."
DEPLOY_OUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$REPO_ROOT/azure/main.bicep" \
  --parameters \
      appName="$APP_NAME" \
      location="$LOCATION" \
      anthropicApiKey="$ANTHROPIC_API_KEY" \
  --query properties.outputs \
  --output json)

ACR_NAME=$(echo "$DEPLOY_OUT"         | python3 -c "import sys,json; print(json.load(sys.stdin)['acrName']['value'])")
ACR_SERVER=$(echo "$DEPLOY_OUT"       | python3 -c "import sys,json; print(json.load(sys.stdin)['acrLoginServer']['value'])")
BACKEND_FQDN=$(echo "$DEPLOY_OUT"     | python3 -c "import sys,json; print(json.load(sys.stdin)['backendUrl']['value'])")
FRONTEND_FQDN=$(echo "$DEPLOY_OUT"    | python3 -c "import sys,json; print(json.load(sys.stdin)['frontendUrl']['value'])")

echo "  ACR        : $ACR_SERVER"
echo "  Backend    : $BACKEND_FQDN"
echo "  Frontend   : $FRONTEND_FQDN"

# ── 4. ACR login ──────────────────────────────────────────────────────────────
echo "▶ Logging into ACR..."
az acr login --name "$ACR_NAME"

BACKEND_IMAGE="$ACR_SERVER/${APP_NAME}-backend:$IMAGE_TAG"
FRONTEND_IMAGE="$ACR_SERVER/${APP_NAME}-frontend:$IMAGE_TAG"

# ── 5. Build + push backend ───────────────────────────────────────────────────
echo "▶ Building backend image..."
az acr build \
  --registry "$ACR_NAME" \
  --image "${APP_NAME}-backend:$IMAGE_TAG" \
  --file "$BACKEND_DIR/Dockerfile" \
  "$BACKEND_DIR"

# ── 6. Deploy backend with real image ─────────────────────────────────────────
echo "▶ Deploying backend container app..."
az containerapp update \
  --name "${APP_NAME}-backend" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$BACKEND_IMAGE" \
  --set-env-vars \
      ANTHROPIC_API_KEY=secretref:anthropic-api-key \
      DEFAULT_MODEL=claude-sonnet-4-6 \
      ALLOWED_ORIGINS="$FRONTEND_FQDN" \
  --output none

# ── 7. Build + push frontend (bakes in backend URL at build time) ─────────────
echo "▶ Building frontend image (NEXT_PUBLIC_API_URL=$BACKEND_FQDN/api)..."
az acr build \
  --registry "$ACR_NAME" \
  --image "${APP_NAME}-frontend:$IMAGE_TAG" \
  --file "$FRONTEND_DIR/Dockerfile" \
  --build-arg "NEXT_PUBLIC_API_URL=$BACKEND_FQDN/api" \
  "$FRONTEND_DIR"

# ── 8. Deploy frontend with real image ────────────────────────────────────────
echo "▶ Deploying frontend container app..."
az containerapp update \
  --name "${APP_NAME}-frontend" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$FRONTEND_IMAGE" \
  --output none

# ── 9. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "✅ Deployment complete!"
echo ""
echo "  Frontend : $FRONTEND_FQDN"
echo "  Backend  : $BACKEND_FQDN"
echo "  Health   : $BACKEND_FQDN/health"
echo ""
echo "To tear down: az group delete --name $RESOURCE_GROUP --yes"
