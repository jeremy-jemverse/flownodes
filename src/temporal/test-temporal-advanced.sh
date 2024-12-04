#!/bin/bash

# Base URL
BASE_URL="http://localhost:4000/api/temporal"

echo "Testing Advanced Temporal Features..."
echo

# Test 1: Start a stateful workflow
echo "1. Starting a stateful workflow:"
WORKFLOW_ID="stateful-workflow-$(date +%s)"
curl -v -X POST "${BASE_URL}/workflow/start" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "workflowId": "'"${WORKFLOW_ID}"'",
    "workflowName": "statefulExample",
    "args": ["Initial message"]
  }'

echo -e "\n\n"
sleep 2

# Test 2: Query current message
echo "2. Querying current message:"
curl -v -X POST "${BASE_URL}/workflow/${WORKFLOW_ID}/query/getCurrentMessage" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "args": []
  }'

echo -e "\n\n"
sleep 2

# Test 3: Update message via signal
echo "3. Sending signal to update message:"
curl -v -X POST "${BASE_URL}/workflow/${WORKFLOW_ID}/signal/updateMessage" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "args": ["Updated message"]
  }'

echo -e "\n\n"
sleep 2

# Test 4: Query updated message
echo "4. Querying updated message:"
curl -v -X POST "${BASE_URL}/workflow/${WORKFLOW_ID}/query/getCurrentMessage" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "args": []
  }'

echo -e "\n\n"
sleep 2

# Test 5: Cancel workflow
echo "5. Cancelling workflow:"
curl -v -X POST "${BASE_URL}/workflow/${WORKFLOW_ID}/cancel" \
  -H "Accept: application/json"
