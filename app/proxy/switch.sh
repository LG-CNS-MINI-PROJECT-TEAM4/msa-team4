#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
if [[ "$TARGET" != "blue" && "$TARGET" != "green" ]]; then
  echo "Usage: $0 {blue|green}" >&2
  exit 1
fi

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CONF_DIR="${BASE_DIR}/conf.d"
ACTIVE="${CONF_DIR}/active.conf"
SRC="${CONF_DIR}/upstream-${TARGET}.conf"

cp -f "$SRC" "$ACTIVE"
echo "[switch] active.conf -> ${TARGET}"

docker exec nginx-proxy nginx -s reload
echo "[switch] nginx reload done"
