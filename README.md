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

For automatic registration emails, add:

- `EMAIL_PROVIDER=smtp`
- `EMAIL_FROM=info@sheqbuddy.com`
- `REGISTRATION_NOTIFY_TO=info@sheqbuddy.com`
- `SMTP_HOST=smtp.hostinger.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=info@sheqbuddy.com`
- `SMTP_PASS=<your email mailbox password>`

The public registration endpoint sends an internal setup notification to
`REGISTRATION_NOTIFY_TO` and a confirmation email to the customer contact email.

## Database migration

Run:

```bash
npm run db:migrate
```

This creates starter backend tables for tenants, licences, users, devices, activation events, reports, actions, notifications and payments.
