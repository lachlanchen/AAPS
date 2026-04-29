#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
python3 backend/aaps_codex_server.py "$@"
