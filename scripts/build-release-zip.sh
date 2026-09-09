#!/usr/bin/env bash
set -euo pipefail

# Determine script and root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUTPUT_ZIP="${1:-lifemetrics-questionnaires-stage11-rc1.zip}"

cd "$ROOT_DIR"
rm -f "$OUTPUT_ZIP"

echo "Building release candidate ZIP: $OUTPUT_ZIP"
zip -r "$OUTPUT_ZIP" lifemetrics-questionnaires \
    -x "lifemetrics-questionnaires/tests/*" \
    -x "*/.DS_Store" \
    -x "*.git*" \
    -x "*~"

echo "Release candidate ZIP created successfully: $OUTPUT_ZIP"
