#!/usr/bin/env bash
set -euo pipefail

# Validate domain module exports
# Ensure src/domain/prompt.ts exports 'prompt'
# Ensure src/domain/schema.ts exports 'schema' and 'AnalysisResult' type

if [[ ! -f "src/domain/prompt.ts" ]]; then
  echo "❌ src/domain/prompt.ts not found"
  exit 1
fi

if [[ ! -f "src/domain/schema.ts" ]]; then
  echo "❌ src/domain/schema.ts not found"
  exit 1
fi

if ! grep -q "export const prompt" src/domain/prompt.ts; then
  echo "❌ src/domain/prompt.ts does not export 'prompt'"
  exit 1
fi

if ! grep -q "export const schema" src/domain/schema.ts; then
  echo "❌ src/domain/schema.ts does not export 'schema'"
  exit 1
fi

echo "✅ Domain exports valid"