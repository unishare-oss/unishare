#!/bin/bash
#
# PostToolUse hook: records each mobile file write/edit in real-time.
# Fires after every Write or Edit tool call — lightweight, one line per file.
# Pairs with log-mobile-changes.sh which writes the full summary on Stop.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ "$FILE_PATH" != *"apps/mobile/"* ]]; then
  exit 0
fi

TOOL=$(echo "$INPUT" | jq -r '.tool_name // "write"')
RELATIVE="${FILE_PATH#*apps/mobile/}"

mkdir -p docs
printf '  [%s] %s: apps/mobile/%s\n' "$(date '+%H:%M')" "$TOOL" "$RELATIVE" >> docs/agent-log.md
