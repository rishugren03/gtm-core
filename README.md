# GTM Core Server

A minimal but production-grade GTM (Go-to-Market) Core Server built with Node.js and TypeScript.

## Features

- **Event Ingestion API**: Validates and processes user events (`signup`, `activation`, etc.) via `POST /events`.
- **In-Memory Storage**: Maintains user state and event history (non-persistent for this version).
- **Decision Engine**:
  - Automatically triggers tasks based on business rules.
  - **Signup** → Creates `send_email` task.
  - **Activation** → Creates `feature_nudge` task.
- **Task Dispatcher**: Dispatches tasks to external webhooks (e.g., n8n). Includes a manual trigger endpoint `POST /dispatch-task`.
- **Idempotency**: Prevents duplicate processing using `event_id`. Duplicate requests are ignored.
- **Decision Logging**: Structured JSON logging for all decisions (audit trail).

## Prerequisites

- Node.js (v16+)
- npm

## Installation

```bash
npm install
```

## Running the Server

Start the development server (with hot-reloading):

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

## API Documentation

### 1. Ingest Event

**Endpoint**: `POST /events`

**Body Schema**:
```json
{
  "event": "string",          // e.g., "signup", "activation"
  "event_id": "uuid",         // Optional (Recommended for idempotency)
  "user_id": "string",
  "product": "string",
  "timestamp": "ISO8601",     // Optional (defaults to now)
  "properties": {}            // Optional key-value pairs
}
```

**Example**:
```bash
curl -X POST "http://localhost:3000/events" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "signup",
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user_123",
    "product": "gtm-core",
    "properties": { "email": "user@example.com" }
  }'
```

### 2. Dispatch Task (Manual Trigger)

**Endpoint**: `POST /dispatch-task`

**Example**:
```bash
curl -X POST "http://localhost:3000/dispatch-task" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task_manual_1",
    "type": "manual_trigger",
    "payload": { "message": "Triggered manually" },
    "status": "pending",
    "createdAt": "2023-10-27T10:00:00Z"
  }'
```

## Testing & Verification

### Quick Test
Run the simplified cURL script:
```bash
./test_curls.sh
```

### Idempotency Verification
Run the TypeScript verification script to test deduplication:
```bash
npx ts-node src/verify_idempotency.ts
```

## Project Structure

```
src/
├── app.ts                  # Express app setup
├── server.ts               # Entry point
├── config/                 # Configuration
├── routes/                 # API Routes
│   ├── events.ts           # Event ingestion & idempotency check
│   └── dispatch.ts         # Task dispatching
├── services/               # Core Logic
│   ├── storage.service.ts  # In-memory store & user state
│   ├── decision.service.ts # Decision engine & logging
│   └── dispatcher.service.ts # External webhook integration
├── types/                  # TypeScript interfaces & Zod schemas
└── utils/                  # Utilities
```

## Idempotency & Logging behavior

- **Idempotency**: If you send the same `event_id` twice, the second request will return `{ "status": "ignored", "reason": "duplicate" }`.
- **Logging**: Check the server console for structured logs like:
  ```json
  {"event":"signup","decision":"send_email","campaign":"welcome_series_v1","user_id":"...","taskId":"..."}
  ```
