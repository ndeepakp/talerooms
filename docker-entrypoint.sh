#!/bin/sh
set -e

# Fly mounts a fresh volume at /app/public/uploads and its fsck recreates a
# root-only `lost+found` on every boot. The Next server scandirs the uploads
# directory at startup and crashes on that unreadable entry. Make it readable
# (and ensure the upload subdirs exist) before starting the server.
mkdir -p /app/public/uploads/avatars /app/public/uploads/feed-wallpapers
chmod 0755 /app/public/uploads/lost+found 2>/dev/null || true

exec node server.js
