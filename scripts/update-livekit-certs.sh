#!/bin/bash

# ==============================================================================
# Torii LiveKit Cert Sync Script
# Description: Syncs Let's Encrypt certs to project folder for Docker access.
# Supports single domain or dedicated TURN domain.
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERTS_DIR="$PROJECT_ROOT/certs"
API_DOMAIN="api.torii.sbs"
TURN_DOMAIN="turn.torii.sbs"

echo "Starting SSL certificate sync for LiveKit..."

# 1. Create certs directory if not exists
mkdir -p "$CERTS_DIR"

# 2. Determine which cert to use
# Priority:
# 1. Combined cert (api + turn) or dedicated turn cert
# 2. Main api cert
SELECTED_DOMAIN="$API_DOMAIN"

if [ -d "/etc/letsencrypt/live/$TURN_DOMAIN" ]; then
    SELECTED_DOMAIN="$TURN_DOMAIN"
    echo "Found dedicated certificates for $TURN_DOMAIN. Using these."
elif [ -d "/etc/letsencrypt/live/$API_DOMAIN" ]; then
    SELECTED_DOMAIN="$API_DOMAIN"
    echo "Using certificates from $API_DOMAIN."
else
    echo "Error: No certificate directory found for $API_DOMAIN or $TURN_DOMAIN at /etc/letsencrypt/live/"
    exit 1
fi

# 3. Copy certificates
echo "Copying certificates from $SELECTED_DOMAIN..."
sudo cp "/etc/letsencrypt/live/$SELECTED_DOMAIN/fullchain.pem" "$CERTS_DIR/"
sudo cp "/etc/letsencrypt/live/$SELECTED_DOMAIN/privkey.pem" "$CERTS_DIR/"

# 4. Set proper permissions
sudo chown -R $USER:$USER "$CERTS_DIR"
chmod 644 "$CERTS_DIR/fullchain.pem"
chmod 644 "$CERTS_DIR/privkey.pem"

echo "Certificates synced successfully to $CERTS_DIR"

# 5. Restart LiveKit to pick up changes
echo "Restarting LiveKit container..."
cd "$PROJECT_ROOT"
sudo docker compose up -d --force-recreate livekit

echo "Done!"
