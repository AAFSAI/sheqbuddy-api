# SHEQBuddy API

Node.js backend API for SHEQBuddy.

## Hostinger settings

- Install command: `npm install`
- Build command: leave blank
- Start command: `npm start`
- Port: use Hostinger's provided `PORT` environment variable, or `3000`

## Current endpoints

- `GET /health`
- `GET /db/health`

## Environment variables

Copy `.env.example` into Hostinger environment variables and replace secrets.

Use the Hostinger database values:

- `DB_NAME=u998300609_sheqbuddy`
- `DB_USER=u998300609_sheqbuddyuser`
- `DB_PASSWORD=<your database password>`

## Database migration

Run:

```bash
npm run db:migrate
```

This creates starter backend tables for tenants, licences, users, devices, activation events, reports, actions, notifications and payments.
