# BCCD Student Services Information System

A React frontend and Node.js + SQLite API for student, Registrar, Cashier, Department, and Admin workspaces.

## Requirements

- Node.js 24 or newer
- npm

## Start the API

The API uses `server/data/ssis.sqlite` by default. It applies additive schema migrations on startup and removes only the explicitly identified fictional seed records shipped with the original starter database. Existing non-seed records are retained.

For an empty database, provision the first administrator through environment variables before starting the API:

```powershell
$env:SSIS_BOOTSTRAP_ADMIN_EMAIL = 'admin@your-institution.edu'
$env:SSIS_BOOTSTRAP_ADMIN_PASSWORD = 'use-a-unique-password-at-least-12-chars'
npm run server
```

The bootstrap account is created only when the database has no users and both values are valid. Clear those variables after the first start. Administrators create later accounts with their own initial passwords.

## Start the frontend

In a second terminal, run:

```powershell
npm install
npm run dev
```

Vite forwards `/api` requests to `http://localhost:4000/api`.

## Database-backed workflows

- Student schedule uses schedule rows and falls back to that student's recorded grades for course codes when no separate schedule rows exist.
- Document requests are stored once and visible to Students and the Registrar/Admin queue. Active duplicate requests are rejected.
- Departments submit student record requests. Only Admins can approve or reject them; approval and student creation run in a transaction.
- Student financial balances use posted charge rows and saved payment rows. The migration creates the charge ledger empty; the system does not invent fees or balances. Payments require a posted balance and are saved with cashier and idempotency audit data.
- No demo records are seeded at startup.

## Configuration

- `PORT`: API port, default `4000`.
- `SSIS_DB_PATH`: optional SQLite file path, useful for isolated deployments and tests.
- `SSIS_BOOTSTRAP_ADMIN_EMAIL` and `SSIS_BOOTSTRAP_ADMIN_PASSWORD`: initial administrator provisioning, only when no users exist.

## Build

```powershell
npm run build
```
