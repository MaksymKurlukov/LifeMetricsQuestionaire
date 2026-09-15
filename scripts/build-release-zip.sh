#!/usr/bin/env bash
set -euo pipefail

# Determine script and root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUTPUT_ZIP="${1:-lifemetrics-questionnaires.zip}"

cd "$ROOT_DIR"
rm -f "$OUTPUT_ZIP"

echo "Building release candidate ZIP: $OUTPUT_ZIP"
zip -r "$OUTPUT_ZIP" lifemetrics-questionnaires \
    -x "lifemetrics-questionnaires/tests/*" \
    -x "lifemetrics-questionnaires/preview.php" \
    -x "*/.DS_Store" \
    -x "*.git*" \
    -x "*~"

# Automated verification of exclusions
if unzip -l "$OUTPUT_ZIP" | grep -q "preview.php"; then
    echo "ERROR: preview.php found in release ZIP!" >&2
    rm -f "$OUTPUT_ZIP"
    exit 1
fi

if unzip -l "$OUTPUT_ZIP" | grep -q "lifemetrics-questionnaires/tests/"; then
    echo "ERROR: tests/ directory found in release ZIP!" >&2
    rm -f "$OUTPUT_ZIP"
    exit 1
fi

echo "Release ZIP verified: preview.php and tests/ are strictly excluded."
echo "Release candidate ZIP created successfully: $OUTPUT_ZIP"
