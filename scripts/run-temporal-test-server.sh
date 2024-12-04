#!/bin/bash

# Check if temporal is running
if ! nc -z localhost 7233; then
    echo "Starting Temporal test server..."
    temporal server start-dev &
    sleep 5  # Wait for server to start
else
    echo "Temporal server is already running"
fi
