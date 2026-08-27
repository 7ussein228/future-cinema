#!/usr/bin/env bash

set -e

# Start backend server in background
cd "$(dirname "$0")/server"
npm start &
BACKEND_PID=$!

# Start frontend server (this will be the exposed port)
cd "$(dirname "$0")/client"
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
