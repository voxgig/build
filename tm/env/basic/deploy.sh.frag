#!/bin/sh
# Deploy the $$Name$$ backend to a plain remote server (generated).
# Usage: BASIC_HOST=user@host sh deploy.sh
set -e
: "${BASIC_HOST:?set BASIC_HOST=user@host}"
cd "$(dirname "$0")/../../.."
npm run build
rsync -az --delete \
  --exclude node_modules --exclude gen --exclude dist-test \
  ./ "$BASIC_HOST:/opt/$$name$$/backend/"
ssh "$BASIC_HOST" "cd /opt/$$name$$/backend && npm install --omit=dev \
  && sudo cp gen/env/basic/$$name$$-backend.service /etc/systemd/system/ \
  && sudo systemctl daemon-reload && sudo systemctl restart $$name$$-backend"
