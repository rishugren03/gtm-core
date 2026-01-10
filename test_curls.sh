#!/bin/bash

# Base URL
URL="http://localhost:3000"

echo "--- 1. Signup Event ---"
curl -X POST "$URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "signup",
    "user_id": "user_curl_1",
    "product": "gtm-core",
    "properties": {
      "email": "curl_user@example.com",
      "source": "cli"
    }
  }'
echo -e "\n"

echo "--- 2. Activation Event ---"
curl -X POST "$URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "activation",
    "user_id": "user_curl_1",
    "product": "gtm-core",
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
  }'
echo -e "\n"

echo "--- 3. Dispatch Task (Manual) ---"
curl -X POST "$URL/dispatch-task" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task_curl_1",
    "type": "manual_trigger",
    "payload": {
      "message": "Hello from curl"
    },
    "status": "pending",
    "createdAt": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
  }'
echo -e "\n"
