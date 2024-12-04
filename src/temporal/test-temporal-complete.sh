#!/bin/bash

echo "Testing Complete Temporal Features..."
echo

# Test versioned workflow (v1)
echo "1. Starting a versioned workflow (v1):"
curl -X POST http://localhost:4000/api/temporal/workflow/start \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "workflowType": "versionedWorkflow",
    "workflowId": "versioned-workflow-'$(date +%s)'",
    "args": ["John"],
    "buildId": "v1"
  }'
echo -e "\n\n"

# Test versioned workflow (v2)
echo "2. Starting a versioned workflow (v2):"
curl -X POST http://localhost:4000/api/temporal/workflow/start \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "workflowType": "versionedWorkflow",
    "workflowId": "versioned-workflow-v2-'$(date +%s)'",
    "args": ["Jane"],
    "buildId": "v2"
  }'
echo -e "\n\n"

# Start an order workflow
ORDER_ID="order-$(date +%s)"
echo "3. Starting an order workflow (Saga pattern):"
curl -X POST http://localhost:4000/api/temporal/workflow/start \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "workflowType": "orderWorkflow",
    "workflowId": "'$ORDER_ID'",
    "args": [
      "'$ORDER_ID'",
      "user123",
      [
        {"productId": "prod1", "quantity": 2},
        {"productId": "prod2", "quantity": 1}
      ],
      99.99
    ],
    "searchAttributes": {
      "CustomStringField": "'$ORDER_ID'",
      "CustomKeywordField": "order_processing"
    }
  }'
echo -e "\n\n"

# Search for order workflows
echo "4. Searching for order workflows:"
curl -G "http://localhost:4000/api/temporal/workflows/search" \
  --data-urlencode "query=CustomKeywordField = 'order_processing'" \
  -H "Accept: application/json"
echo -e "\n\n"

# Query order status
echo "5. Querying order status:"
sleep 2
curl -X POST "http://localhost:4000/api/temporal/workflow/$ORDER_ID/query/getOrderStatus" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}'
echo -e "\n\n"

# Query order progress
echo "6. Querying order progress:"
curl -X POST "http://localhost:4000/api/temporal/workflow/$ORDER_ID/query/getOrderProgress" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}'
echo -e "\n\n"

# Add order item via signal
echo "7. Adding order item via signal:"
curl -X POST "http://localhost:4000/api/temporal/workflow/$ORDER_ID/signal/addOrderItem" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"productId": "prod3", "quantity": 1}'
echo -e "\n\n"

# Cancel order via signal
echo "8. Cancelling order:"
sleep 1
curl -X POST "http://localhost:4000/api/temporal/workflow/$ORDER_ID/signal/cancelOrder" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}'
echo -e "\n\n"

# Query final order status
echo "9. Querying final order status:"
sleep 2
curl -X POST "http://localhost:4000/api/temporal/workflow/$ORDER_ID/query/getOrderStatus" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}'
echo -e "\n\n"
