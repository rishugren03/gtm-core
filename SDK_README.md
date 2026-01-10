# GTM Core Integration Guide

This guide explains how to integrate your application with the GTM Core Server.

## Overview

The GTM Core Server exposes a RESTful API to ingest user events and trigger business workflows (campsigns, emails, nudges).

**Base URL**: `http://localhost:3000` (or your deployed URL)

## Integration Steps

### 1. Identify User Events

Determine which events in your application should trigger GTM workflows. Common examples:
- `signup`
- `activation` (e.g., first meaningful action)
- `payment`
- `invite_friend`

### 2. Send Events (Client-Side or Server-Side)

Send a POST request to `/events` for each occurrence.

**Recommendations:**
- **Server-Side**: Preferred for reliability and security.
- **Client-Side**: Acceptable for interactions, but ensure you handle CORS if connecting directly (CORS is not currently configured in Core, recommended to proxy through your backend).

### 3. API Specification

#### Endpoint: `POST /events`

**Headers:**
- `Content-Type: application/json`

**Body:**

```typescript
interface EventPayload {
  event: string;           // The name of the event (matches config/campaigns.json)
  user_id: string;         // Unique identifier for the user
  event_id?: string;       // (Recommended) UUID for idempotency
  product?: string;        // Product identifier (e.g., "my-saas-app")
  properties?: Record<string, any>; // Arbitrary metadata (email, pricing plan, etc.)
  timestamp?: string;      // ISO 8601 string (optional, defaults to now)
}
```

### 4. Code Examples

#### Node.js / TypeScript (Backend)

```typescript
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

async function trackEvent(eventName: string, userId: string, properties: any = {}) {
  try {
    await axios.post('http://localhost:3000/events', {
      event: eventName,
      user_id: userId,
      event_id: uuidv4(), // Generate UUID for deduplication
      product: 'my-app',
      properties
    });
  } catch (error) {
    console.error('Failed to send event to GTM Core:', error);
    // Retry logic can be added here
  }
}

// Usage
await trackEvent('signup', 'user_123', { email: 'alice@example.com' });
```

#### Python

```python
import requests
import uuid

def track_event(event_name, user_id, properties=None):
    payload = {
        "event": event_name,
        "user_id": user_id,
        "event_id": str(uuid.uuid4()),
        "product": "my-app",
        "properties": properties or {}
    }
    try:
        requests.post("http://localhost:3000/events", json=payload)
    except Exception as e:
        print(f"Error sending event: {e}")

# Usage
track_event("activation", "user_123")
```

#### cURL

```bash
curl -X POST "http://localhost:3000/events" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "signup",
    "event_id": "unique-id-123",
    "user_id": "user_123",
    "properties": { "email": "bob@example.com" }
  }'
```

### 5. Idempotency

Always send a unique `event_id` (UUID v4 recommended). If GTM Core receives the same `event_id` twice, it will ignore the second request. This prevents duplicate emails or tasks if your system retries requests.

**Response for Duplicate:**
```json
{
  "status": "ignored",
  "reason": "duplicate",
  "eventId": "..."
}
```

### 6. Handling Responses

- **200 OK**: Event received.
    - `status: "received"`: Successfully processed.
    - `status: "ignored"`: Ignored (duplicate or invalid lifecycle transition).
- **400 Bad Request**: Invalid schema (missing user_id, etc.).
- **500 Internal Error**: Server issue.

### 7. Lifecycle Rules

The system enforces a strict user lifecycle:
1.  **Anonymous** (Default)
2.  **Signed Up** (Triggered by `signup` event)
3.  **Activated** (Triggered by `activation` event)

**Rules:**
- You **CANNOT** send `activation` for a user who hasn't sent `signup`.
- You **CANNOT** send `signup` for a user who is already signed up.

If you violate these, the event will be ignored with `reason: "invalid_transition"`.
