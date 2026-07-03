#!/usr/bin/env bash
# 이슈 완료 전 필수 검증. 하나라도 실패하면 완료 아님.
set -euo pipefail

echo "▶ lint"
pnpm -r lint

echo "▶ typecheck"
pnpm -r typecheck

echo "▶ test"
pnpm -r test -- --run

echo "▶ build"
pnpm -r build

# API 키 유출 검사 (커밋 전 안전망)
echo "▶ secret scan"
if git grep -nE "serviceKey=[A-Za-z0-9%+/=]{20,}" -- ':!*.md' 2>/dev/null; then
  echo "❌ API 키로 보이는 문자열이 코드에 있습니다."
  exit 1
fi

echo "✅ verify passed"
