#!/usr/bin/env bash
# Convenience: install, slice sprites, run tests, then start dev server.
set -e
cd "$(dirname "$0")"

echo "==> npm install"
npm install

echo "==> slicing sprites"
npm run slice-sprites

echo "==> running engine tests"
npm test

echo "==> starting dev server on http://localhost:3000"
echo "    Create a room, then in other terminals run agents:"
echo "    ROOM=<code> API=http://localhost:3000 NAME=Alice node public/agent-sdk/agent-example.mjs"
npm run dev
