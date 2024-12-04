#!/bin/bash

# Base URL
BASE_URL="http://localhost:4000/api/temporal"

echo "Testing Temporal endpoints..."
echo

# Test 1: Starting a workflow
echo "1. Starting a workflow:"
WORKFLOW_ID="test-workflow-$(date +%s)"
curl -v -X POST "${BASE_URL}/workflow/start" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "workflowId": "'"${WORKFLOW_ID}"'",
    "workflowName": "example",
    "args": ["John"]
  }'

echo -e "\n\n"

# Wait a moment for the workflow to process
sleep 2

# Test 2: Getting workflow status
echo "2. Getting workflow status:"
curl -v -X GET "${BASE_URL}/workflow/${WORKFLOW_ID}" \
  -H "Accept: application/json"

echo -e "\n\n"

# Test 3: Cancelling workflow
echo "3. Cancelling workflow:"
curl -v -X POST "${BASE_URL}/workflow/${WORKFLOW_ID}/cancel" \
  -H "Accept: application/json"
