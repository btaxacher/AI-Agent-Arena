#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install --include=dev

echo "=== Building shared package ==="
cd packages/shared
npx tsup src/index.ts --format esm --dts
cd ../..

echo "=== Building db package ==="
cd packages/db
npx tsup src/index.ts --format esm --dts
cd ../..

echo "=== Building engine package ==="
cd packages/engine
npx tsup src/index.ts --format esm --dts
cd ../..

echo "=== Building api package ==="
cd packages/api
npx tsup src/index.ts --format esm --dts
cd ../..

echo "=== Build complete ==="
