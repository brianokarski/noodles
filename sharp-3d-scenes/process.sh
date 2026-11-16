#!/bin/bash
# SHARP Processing Script
# Converts all images in inputs/ to 3D Gaussian splats

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT_DIR="$SCRIPT_DIR/inputs"
OUTPUT_DIR="$SCRIPT_DIR/outputs"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎬 SHARP 3D Scene Generator${NC}"
echo "================================"

# Check if inputs folder has images
if [ -z "$(ls -A "$INPUT_DIR" 2>/dev/null)" ]; then
    echo "❌ No images found in inputs/ folder"
    echo "   Add some images and try again!"
    exit 1
fi

# Count images
IMAGE_COUNT=$(find "$INPUT_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) | wc -l | tr -d ' ')
echo "📸 Found $IMAGE_COUNT image(s) to process"
echo ""

# Run SHARP
echo "🔄 Processing with SHARP..."
sharp predict -i "$INPUT_DIR" -o "$OUTPUT_DIR"

echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo "📂 Output files are in: $OUTPUT_DIR"
echo "🌐 View them at: https://supersplat.io"
echo ""

# Open output folder
open "$OUTPUT_DIR"
