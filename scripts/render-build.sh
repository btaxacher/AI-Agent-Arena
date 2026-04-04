#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install --include=dev

echo "=== Building shared package ==="
npm run build --workspace=packages/shared

echo "=== Building db package ==="
npm run build --workspace=packages/db

echo "=== Building engine package ==="
npm run build --workspace=packages/engine

echo "=== Building api package ==="
npm run build --workspace=packages/api

echo "=== Build complete ==="
