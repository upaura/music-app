#!/bin/bash
# Push music-studio to GitHub

echo "🚀 Pushing to GitHub..."

# Add remote (if not exists)
if ! git remote get-url origin &>/dev/null; then
    git remote add origin https://github.com/upaura/music-app.git
fi

# Add all files
git add .

# Commit
echo "Enter commit message (press Enter for default):"
read MSG
if [ -z "$MSG" ]; then
    MSG="Music Studio - $(date '+%Y-%m-%d %H:%M')"
fi
git commit -m "$MSG"

# Push
echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "✅ Done! Code is now on https://github.com/upaura/music-app"
