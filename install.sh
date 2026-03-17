#!/usr/bin/env bash
set -euo pipefail

DEST="$HOME/.claude/statusline.sh"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp "$SCRIPT_DIR/statusline.sh" "$DEST"
chmod +x "$DEST"

# settings.json에 statusLine 설정 추가 (jq 필요)
SETTINGS="$HOME/.claude/settings.json"
if command -v jq &>/dev/null && [[ -f "$SETTINGS" ]]; then
  if ! jq -e '.statusLine' "$SETTINGS" &>/dev/null; then
    tmp=$(mktemp)
    jq '. + {"statusLine": {"type": "command", "command": "~/.claude/statusline.sh"}}' "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS"
    echo "settings.json에 statusLine 설정 추가 완료"
  else
    echo "settings.json에 이미 statusLine 설정이 있습니다"
  fi
else
  echo "settings.json에 수동으로 추가하세요:"
  echo '  "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" }'
fi

echo "설치 완료: $DEST"
