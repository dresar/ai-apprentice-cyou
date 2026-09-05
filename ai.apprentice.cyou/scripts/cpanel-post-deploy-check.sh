#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${1:-${API_BASE_URL:-}}"
if [[ -z "$BASE" ]]; then
  echo "Pemakaian: $0 https://api.domain-anda.com"
  exit 1
fi
export API_BASE_URL="$BASE"
node scripts/cpanel-deploy-verify.mjs "$BASE"