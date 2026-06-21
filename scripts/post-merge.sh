#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "Installing dependencies..."
npm install --workspaces --include-workspace-root --no-audit --no-fund

echo "Done."
