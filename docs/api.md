# Temporal Workflow API Documentation

This document outlines the available API endpoints for interacting with Temporal workflows in the Flownodes application.

## Base URL
```
/temporal
```

## Endpoints

### Start Workflow
Initiates a new workflow instance.

**Endpoint:** `POST /temporal/workflow/start`

**Request Body:**
```json
{
  "workflowId": "string",
  "workflowType": "string",
  "args": "array",
  "searchAttributes": {
    "CustomStringField": "string",
    "CustomKeywordField": "string"
  }
}
```

**Example:**
```json
{
  "workflowId": "order-123",
  "workflowType": "orderWorkflow",
  "args": ["order-123", "user-456", [{"productId": "prod-1", "quantity": 2}], 100],
  "searchAttributes": {
    "CustomStringField": "order-123",
    "CustomKeywordField": "order_processing"
  }
}
```

**Response:**
```json
{
  "success": true,
  "workflowId": "order-123"
}
```

### Get Workflow Status
Retrieves the current status of a workflow.

**Endpoint:** `GET /temporal/workflow/:workflowId`

**Response:**
```json
{
  "success": true,
  "status": {
    "status": "COMPLETED" | "PROCESSING" | "PAYMENT_FAILED" | "INVENTORY_FAILED" | "CANCELLED"
  }
}
```

### Query Order Status
Queries the current status of an order workflow.

**Endpoint:** `POST /temporal/workflow/:workflowId/query/getOrderStatus`

**Response:**
```json
{
  "status": "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"
}
```

### Query Order Progress
Retrieves detailed progress information about an order.

**Endpoint:** `POST /temporal/workflow/:workflowId/query/getOrderProgress`

**Response:**
```json
{
  "payment": {
    "status": "PENDING" | "COMPLETED" | "FAILED",
    "amount": number
  },
  "inventory": {
    "status": "PENDING" | "COMPLETED" | "FAILED",
    "items": array
  },
  "overall": {
    "progress": number,
    "status": "PROCESSING" | "COMPLETED" | "FAILED"
  }
}
```

### Add Order Item
Adds a new item to an existing order.

**Endpoint:** `POST /temporal/workflow/:workflowId/signal/addOrderItem`

**Request Body:**
```json
{
  "productId": "string",
  "quantity": number
}
```

**Response:**
```json
{
  "success": true
}
```

### Cancel Workflow
Cancels an in-progress workflow.

**Endpoint:** `POST /temporal/workflow/:workflowId/cancel`

**Response:**
```json
{
  "success": true
}
```

### Search Workflows
Searches for workflows based on search attributes.

**Endpoint:** `GET /temporal/workflows/search`

**Query Parameters:**
- `query`: Search query string (e.g., `CustomStringField = "search-test"`)

**Response:**
```json
[
  {
    "workflowId": "string",
    "status": "string",
    "startTime": "string",
    "searchAttributes": object
  }
]
```

## Error Handling

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "details": "Description of the error"
}
```

### 404 Not Found
```json
{
  "error": "Workflow not found",
  "workflowId": "requested-workflow-id"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Description of the error"
}
```

## Usage Examples

### Starting a New Order Workflow
```bash
curl -X POST http://localhost:3000/temporal/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "order-123",
    "workflowType": "orderWorkflow",
    "args": ["order-123", "user-456", [{"productId": "prod-1", "quantity": 2}], 100],
    "searchAttributes": {
      "CustomStringField": "order-123",
      "CustomKeywordField": "order_processing"
    }
  }'
```

### Checking Order Status
```bash
curl -X GET http://localhost:3000/temporal/workflow/order-123
```

### Adding an Item to an Order
```bash
curl -X POST http://localhost:3000/temporal/workflow/order-123/signal/addOrderItem \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-2",
    "quantity": 1
  }'
```

### Cancelling an Order
```bash
curl -X POST http://localhost:3000/temporal/workflow/order-123/cancel
```

### Searching for Orders
```bash
curl -X GET "http://localhost:3000/temporal/workflows/search?query=CustomStringField = 'order-123'"
```
