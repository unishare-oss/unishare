#!/bin/bash
#
# Stop hook: appends git file changes to the current session entry in docs/agent-log.md.
# Only runs when apps/mobile/ files are affected.
# Pairs with the session header Claude writes at the start of every mobile session.

MOBILE_STATUS=$(git status --short -- apps/mobile/ 2>/dev/null)

if [ -z "$MOBILE_STATUS" ]; then
  exit 0
fi

mkdir -p docs

LOG="docs/agent-log.md"

# Warn if Claude forgot to write a session header (no entry since last ---)
LAST_SECTION=$(awk '/^---/{found=NR} END{print NR-found}' "$LOG" 2>/dev/null)
if [ -z "$LAST_SECTION" ] || [ "$LAST_SECTION" -lt 2 ]; then
  printf '\n[WARNING: session header was not written — member/agent/task unknown]\n' >> "$LOG"
fi

{
  printf 'Files:\n'
  while IFS= read -r line; do
    status="${line:0:2}"
    file="${line:3}"
    case "${status// /}" in
      M)  printf '  ~ %s\n' "$file" ;;
      A)  printf '  + %s\n' "$file" ;;
      D)  printf '  - %s\n' "$file" ;;
      R)  printf '  > %s\n' "$file" ;;
      ??) printf '  ? %s (untracked)\n' "$file" ;;
      *)  printf '  %s %s\n' "$status" "$file" ;;
    esac
  done <<< "$MOBILE_STATUS"
  STAT=$(git diff --stat HEAD -- apps/mobile/ 2>/dev/null | tail -1)
  [ -n "$STAT" ] && printf 'Summary: %s\n' "$STAT"
  printf '\n'
} >> "$LOG"
