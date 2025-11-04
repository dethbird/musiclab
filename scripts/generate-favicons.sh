#!/usr/bin/env bash
set -euo pipefail

# generate-favicons.sh
# Usage: ./generate-favicons.sh path/to/source.png
# Produces files in public/assets/:
# - favicon.png (512x512)
# - favicon-192.png (192x192)
# - apple-touch-icon.png (180x180)
# - favicon.ico (multi-size 16/32/48)

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 path/to/source.png"
  exit 2
fi

SRC="$1"
DST_DIR="$(dirname "$0")/../public/assets"
mkdir -p "$DST_DIR"

if [ ! -f "$SRC" ]; then
  echo "Source file not found: $SRC"
  exit 2
fi

# Ensure convert exists
if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' not found in PATH"
  exit 3
fi

# Create base PNGs (preserve transparency)
# Use a transparent background for extent so rounded/irregular logos keep alpha
convert "$SRC" -resize 512x512^ -gravity center -background none -extent 512x512 "$DST_DIR/favicon.png"
convert "$DST_DIR/favicon.png" -resize 192x192 "$DST_DIR/favicon-192.png"
convert "$DST_DIR/favicon.png" -resize 180x180 "$DST_DIR/apple-touch-icon.png"

# Create multi-resolution ICO (16,32,48) preserving transparency where supported
convert "$DST_DIR/favicon.png" -background none -resize 16x16  "$DST_DIR/favicon-16.png"
convert "$DST_DIR/favicon.png" -background none -resize 32x32  "$DST_DIR/favicon-32.png"
convert "$DST_DIR/favicon.png" -background none -resize 48x48  "$DST_DIR/favicon-48.png"
# Build ICO from the PNG sizes; convert will include alpha channels when possible
convert "$DST_DIR/favicon-16.png" "$DST_DIR/favicon-32.png" "$DST_DIR/favicon-48.png" "$DST_DIR/favicon.ico"

# Cleanup intermediates
rm -f "$DST_DIR/favicon-16.png" "$DST_DIR/favicon-32.png" "$DST_DIR/favicon-48.png"

echo "Favicons generated in $DST_DIR"
