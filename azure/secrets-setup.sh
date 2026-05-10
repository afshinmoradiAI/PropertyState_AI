#!/usr/bin/env bash
# Run this ONCE to create the AZURE_CREDENTIALS secret for GitHub Actions.
# Prerequisites: az CLI installed and logged in, gh CLI installed and logged in.
# Usage: bash azure/secrets-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RESOURCE_GROUP="propertystate-rg"
APP_NAME="PropertyState AI"

echo "▶ Getting subscription ID..."
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

echo "▶ Creating service principal for GitHub Actions..."
CREDENTIALS=$(az ad sp create-for-rbac \
  --name "$APP_NAME GitHub Actions" \
  --role Contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --sdk-auth \
  --output json)

echo ""
echo "▶ Setting AZURE_CREDENTIALS secret on GitHub repo..."
echo "$CREDENTIALS" | gh secret set AZURE_CREDENTIALS

echo ""
echo "▶ Setting ANTHROPIC_API_KEY secret on GitHub repo..."
echo -n "Paste your Anthropic API key: "
read -rs ANTHROPIC_API_KEY
echo ""
echo "$ANTHROPIC_API_KEY" | gh secret set ANTHROPIC_API_KEY

echo ""
echo "✅ Done. GitHub secrets set:"
echo "   • AZURE_CREDENTIALS"
echo "   • ANTHROPIC_API_KEY"
echo ""
echo "Next: push to main to trigger the deploy workflow."
