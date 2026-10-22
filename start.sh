#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-4173}"
echo ""
echo "  APERTURE / STORYBOARD STUDIO"
echo "  http://127.0.0.1:${PORT}"
echo "  Ctrl+C to stop"
echo ""
python3 -m http.server "$PORT" --bind 127.0.0.1
