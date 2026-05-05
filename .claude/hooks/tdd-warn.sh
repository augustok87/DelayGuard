#!/usr/bin/env bash
# TDD-warn: PreToolUse hook for `Write` calls.
# Warns if a new source file under delayguard-app/src/ is being written
# without a sibling *.test.ts(x). Advisory only (exit 1 — non-blocking, user-visible).
#
# To make this BLOCKING and surface the warning into the agent's context, change
# the trailing `exit 1` to `exit 2`. (Per Claude Code hook spec: exit 2 blocks
# the tool call AND injects stderr into the agent transcript; exit 1 just shows
# the message to the user.)
set -euo pipefail

INPUT="$(cat)"
FILE_PATH="$(node -e "const d=JSON.parse(process.argv[1]||'{}');process.stdout.write(d.tool_input?.file_path||'')" "$INPUT")"
[ -z "$FILE_PATH" ] && exit 0

# Only fire on TS/TSX inside delayguard-app/src/
case "$FILE_PATH" in
  *delayguard-app/src/*.ts|*delayguard-app/src/*.tsx) ;;
  *) exit 0 ;;
esac

# Exclusions: tests, mocks, types/constants/index/barrel files
case "$FILE_PATH" in
  */tests/*|*/__mocks__/*|*.test.ts|*.test.tsx) exit 0 ;;
  */types.ts|*/types/*|*/constants.ts|*/index.ts) exit 0 ;;
esac

# Sibling test exists?
BASE="${FILE_PATH%.tsx}"
BASE="${BASE%.ts}"
if [ -f "$BASE.test.ts" ] || [ -f "$BASE.test.tsx" ]; then
  exit 0
fi

# Also accept a co-located test under a sibling __tests__/ dir or src/tests/unit mirror
DIR="$(dirname "$FILE_PATH")"
NAME="$(basename "$BASE")"
if [ -f "$DIR/__tests__/$NAME.test.ts" ] || [ -f "$DIR/__tests__/$NAME.test.tsx" ]; then
  exit 0
fi

echo "TDD-warn: $FILE_PATH has no sibling test ($BASE.test.ts or .test.tsx)." >&2
echo "         Project workflow mandates writing tests first. See .claude/rules/tests.md" >&2
exit 1
