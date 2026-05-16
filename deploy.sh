#!/bin/bash
# deploy.sh — Deploy camera dashboard to display PC
# Usage: ./deploy.sh [options]
#
# Options:
#   --user USERNAME    Display PC username (default: omnicy)
#   --host HOST        Display PC hostname/IP (default: 10.10.0.241)
#   --target TARGET    Deploy target: python | desktop (default: python)
#   --dry-run          Show what would be deployed without actually deploying

set -e

# ── Defaults ──
USER="omnicy"
HOST="10.10.0.241"
TARGET="python"
DRY_RUN=false
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/public"
CONFIG_DIR="$SCRIPT_DIR/config"

# ── Parse args ──
while [[ $# -gt 0 ]]; do
    case $1 in
        --user)   USER="$2"; shift 2 ;;
        --host)   HOST="$2"; shift 2 ;;
        --target) TARGET="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Verify files ──
if [ ! -f "$PUBLIC_DIR/index.html" ] || [ ! -f "$PUBLIC_DIR/style.css" ] || [ ! -f "$PUBLIC_DIR/dashboard.js" ]; then
    echo "ERROR: Missing required files in public/"
    exit 1
fi

if [ ! -f "$CONFIG_DIR/cameras.json" ]; then
    echo "ERROR: Missing config/cameras.json"
    exit 1
fi

echo "=== Camera Dashboard Deploy ==="
echo "Target:  $USER@$HOST"
echo "Method:  $TARGET"
echo ""

# ── Prepare staging ──
STAGING=$(mktemp -d)
cp "$PUBLIC_DIR"/* "$STAGING/"
cp "$CONFIG_DIR/cameras.json" "$STAGING/"

if $DRY_RUN; then
    echo "=== DRY RUN ==="
    echo "Files that would be deployed:"
    ls -la "$STAGING/"
    echo ""
    echo "Target path: ~/cam-dashboard/"
    rm -rf "$STAGING"
    exit 0
fi

# ── Deploy ──
case $TARGET in
    python)
        echo "Step 1/2: Uploading files..."
        sshpass -p 'elongimon' ssh -o StrictHostKeyChecking=no "$USER@$HOST" 'mkdir -p ~/cam-dashboard'
        scp -o StrictHostKeyChecking=no "$STAGING"/* "$USER@$HOST:~/cam-dashboard/"
        echo "Step 2/2: Starting Python HTTP server..."
        sshpass -p 'elongimon' ssh -o StrictHostKeyChecking=no "$USER@$HOST" \
            'cd ~/cam-dashboard && nohup python3 -m http.server 8888 > /dev/null 2>&1 & echo $!'
        echo ""
        echo "✅ Deployed!"
        echo "   Access at: http://$HOST:8888/"
        echo ""
        echo "   To set up auto-start on boot:"
        echo "   1. SSH to display PC: ssh $USER@$HOST"
        echo "   2. Add to crontab (crontab -e):"
        echo "      @reboot sleep 10 && cd ~/cam-dashboard && python3 -m http.server 8888 &"
        ;;
    desktop)
        echo "Step 1/3: Uploading files..."
        sshpass -p 'elongimon' ssh -o StrictHostKeyChecking=no "$USER@$HOST" 'mkdir -p ~/cam-dashboard'
        scp -o StrictHostKeyChecking=no "$STAGING"/* "$USER@$HOST:~/cam-dashboard/"
        echo "Step 2/3: Opening in Firefox..."
        sshpass -p 'elongimon' ssh -o StrictHostKeyChecking=no "$USER@$HOST" \
            'cd ~/cam-dashboard && python3 -m http.server 8888 &'
        echo ""
        echo "✅ Deployed!"
        echo "   Access at: http://$HOST:8888/"
        echo ""
        echo "   To open in Firefox on the display PC, run:"
        echo "   firefox http://localhost:8888/"
        echo ""
        echo "   For fullscreen (kiosk) mode:"
        echo "   firefox --kiosk http://localhost:8888/"
        ;;
    *)
        echo "ERROR: Unknown target: $TARGET"
        echo "Valid options: python, desktop"
        rm -rf "$STAGING"
        exit 1
        ;;
esac

# Cleanup
rm -rf "$STAGING"
