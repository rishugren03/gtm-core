# GTM Core Server

A minimal but production-grade GTM (Go-to-Market) Core Server built with Node.js and TypeScript.

## Features

- **Event Ingestion API**: Validates and processes user events (`signup_completed`, `activated`, `first_value_action`, etc.) via `POST /events`.
- **In-Memory Storage**: Maintains user state and event history (non-persistent for this version).
- **Lifecycle Management**: Enforces strict user states (`ANONYMOUS` -> `SIGNED_UP` -> `ACTIVATED`). Invalid transitions are rejected.
- **Decision Engine**:
  - Automatically triggers tasks based on `config/campaigns.json`.
  - **Immediate Actions**: e.g., Signup -> Send Welcome Email immediately.
  - **Delayed Campaigns**: e.g., Trigger `activation_nudge` 24h after `signup_completed`.
  - **Cancellation**: e.g., `first_value_action` cancels a pending `activation_nudge`.
  - **Duplicate Prevention**: Prevents scheduling the same delayed campaign multiple times for the same user.
  - **Email Template Registry**: Centralized templates with variable validation and defaults.
- **Scheduler**: 
  - In-memory delayed task execution (`setTimeout` wrapper).
  - Abstracted interface allowing easy swap to Redis/BullMQ.
- **Task Dispatcher**: Dispatches tasks to external webhooks (e.g., n8n). Includes a manual trigger endpoint `POST /dispatch-task`.
- **Idempotency**: Prevents duplicate processing using `event_id`. Duplicate requests are ignored.
- **Observability**: Structured JSON logging for all decisions (`campaign_scheduled`, `campaign_cancelled`, `email_dispatch`).

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

## Configuration

**Campaign Rules** are defined in `src/config/campaigns.json`.

Example:
```json
{
  "signup_completed": {
    "task": "send_email",
    "template": "welcome_v1"
  },
  "signup_completed_delayed": {
    "delay": "24h",
    "cancel_if": "first_value_action",
    "task": "send_email",
    "template": "activation_nudge_v1"
  }
}
```

## API Documentation

### 1. Ingest Event

**Endpoint**: `POST /events`

**Body Schema**:
```json
{
  "event": "string",          // e.g., "signup_completed"
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
    "event": "signup_completed",
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

### Scripts
A comprehensive verification suite is available in `src/scripts`.

**Run Complete Verification:**
Tests immediate dispatch, lifecycle rules, delayed scheduling, duplicate prevention, and cancellation.
```bash
npx ts-node src/scripts/verify_complete.ts
```

## Project Structure

```
src/
├── app.ts                  # Express app setup
├── server.ts               # Entry point
├── config/                 # Campaign rules & template vars
├── routes/                 # API Routes
├── services/               # Core Logic
│   ├── decision.service.ts # Rules, Scheduling, Cancellation logic
│   ├── storage.service.ts  # In-memory store & lifecycle state
│   ├── dispatcher.service.ts # n8n integration
│   ├── inmemory.scheduler.ts # setTimeout-based scheduler
│   └── templateVariables.service.ts # Variable resolution
├── scripts/                # Verification scripts
├── templates/              # Email template definitions
├── types/                  # TypeScript interfaces & Zod schemas
└── utils/                  # Utilities
```

## Idempotency & Logging behavior

- **Idempotency**: If you send the same `event_id` twice, the second request will return `{ "status": "ignored", "reason": "duplicate" }`.
- **Logging**: The server outputs structured JSON logs.
  - `campaign_scheduled`: Task added to scheduler.
  - `campaign_cancelled`: Task removed due to `cancel_if` event.
  - `campaign_executed`: Task time reached and dispatched.
  - `email_dispatch`: Email template validated and sent to dispatcher.
