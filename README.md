# Pacific Coast Auto Service — AI Voice Receptionist

A production-minded portfolio prototype for an inbound automotive-service receptionist using Vapi, n8n Community Edition, Google Calendar, and a TypeScript booking service. It includes an interactive browser dashboard and works locally in mock mode without Vapi credits or Google credentials.

> Status: the mock path is locally testable. Live Vapi and Google Calendar behavior is implemented but is not claimed as verified until credentials are supplied and an end-to-end call is completed.

## Architecture

```mermaid
flowchart LR
  Caller((Caller)) --> Vapi[Vapi voice assistant]
  Vapi -->|function tool HTTPS| N8N[n8n webhooks]
  N8N -->|authenticated request| API[TypeScript booking API]
  API --> Rules[validation, timezone, hours, conflicts]
  Rules --> Provider{calendar mode}
  Provider -->|mock| Mock[In-memory calendar]
  Provider -->|google| GCal[Google Calendar API]
  GCal -->|event created| API
  API -->|confirmed only with event ID| N8N --> Vapi --> Caller
```

The booking service is the system of record for scheduling policy. Both availability and booking re-check Calendar. Event creation uses an idempotency key. If event creation fails, the response always contains `confirmed: false`; the assistant prompt forbids verbal confirmation without both `confirmed: true` and an `eventId`.

## Repository map

```text
src/                  TypeScript API, booking rules, Calendar adapters
tests/                Domain and HTTP integration tests
vapi/assistant.json   Vapi assistant and function-tool definition
n8n/workflows/        Importable availability and booking workflows
scripts/              Mock demo, OAuth helper, artifact validation
docs/                 Conversation and deployment guidance
.github/workflows/    CI test workflow
docker-compose.yml    Booking API + n8n Community Edition
```

## Local mock demo

Requirements: Node.js 20+ (Node 22 is used in CI and containers).

```bash
cp .env.example .env
npm ci
npm test
npm run demo
npm start
```

Open `http://localhost:3000` for the interactive portfolio demo. Reviewers can check availability and create mock appointments without any credentials. The demo routes always use an isolated in-memory calendar and cannot modify Google Calendar.

Then verify:

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/availability \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer replace-with-a-long-random-value' \
  -d '{"date":"2026-10-22","service":"oil_change","timezone":"America/Los_Angeles"}'
```

Mock mode stores events in memory and supports `MOCK_CALENDAR_FAIL=true` to exercise failure handling. Restarting the process clears mock events.

## Docker and n8n

1. Copy `.env.example` to `.env` and replace all placeholder secrets.
2. Run `docker compose up --build`.
3. Open `http://localhost:5678`, finish local n8n setup, and import both JSON files in `n8n/workflows/`.
4. Activate the workflows. For external Vapi calls, expose webhook paths through an approved HTTPS reverse proxy/tunnel; do not expose the n8n editor.

The checked-in Compose file pins n8n for repeatability. Review and test upgrades regularly. This host did not have Docker installed, so Compose was reviewed statically rather than executed here.

## Connect Google Calendar

1. In a Google Cloud project, enable Google Calendar API and create an OAuth 2.0 client.
2. Add the redirect URI used in `.env`. For a local helper flow, use an installed-app compatible redirect URI supplied by Google.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` locally.
4. Run `npm run oauth:google`, complete consent, and store the returned refresh token in a secret manager or local `.env` as `GOOGLE_REFRESH_TOKEN`.
5. Set `CALENDAR_MODE=google` and `GOOGLE_CALENDAR_ID` (a dedicated shop calendar is recommended).

The helper requests only Calendar events and free/busy access. Refresh tokens and OAuth secrets are ignored by Git and must never be committed.

## Connect Vapi

1. Import or reproduce `vapi/assistant.json` in Vapi. The JSON intentionally contains placeholder n8n URLs.
2. Replace `YOUR_N8N_HOST` with the public HTTPS n8n host.
3. In Vapi, create a bearer-token Custom Credential using the same secret as `VAPI_WEBHOOK_TOKEN`, and attach it to each function tool's server configuration. Do not paste secrets into this repository.
4. Confirm the model/voice providers available in your Vapi account, publish the assistant, and attach a phone number.
5. Run a test call for availability, success, conflict, incomplete caller information, and simulated/upstream failure.

Vapi posts function calls to n8n; n8n authenticates to the booking API. Vapi function-tool server URLs have the highest webhook routing priority. See the current [Vapi function tools guide](https://docs.vapi.ai/tools/custom-tools), [server URL precedence](https://docs.vapi.ai/server-url/setting-server-urls), and [server authentication guide](https://docs.vapi.ai/server-url/server-authentication).

## Scheduling behavior

- Business timezone: `America/Los_Angeles`; weekdays 8:00 AM–6:00 PM.
- Durations: oil change 60 minutes, brakes 120, diagnostics/tire/general maintenance 90.
- Candidate slots begin every 30 minutes and must finish by closing.
- Caller-local ISO timestamps are converted to Pacific time and then UTC for Calendar.
- Availability is advisory; booking always performs a second conflict check.
- Required booking fields are validated before Calendar access.
- Google events carry a private idempotency key to make retries safe.
- An invite is sent only when the caller supplied an email.

These durations are prototype assumptions; update `src/domain/booking.ts` to match real shop capacity and bay/resource rules.

## Testing

```bash
npm run typecheck
npm test
npm run build
npm run validate:artifacts
```

Tests cover business hours/weekends, conflicts, required information, successful creation, upstream failure, idempotent retry, dashboard delivery, isolated demo routes, health, request validation, and Vapi response shape. CI runs these checks on pushes and pull requests.

## Production considerations

This prototype is single-calendar/single-capacity. A real shop should model bays and technician skills, use durable idempotency storage, rate-limit endpoints, validate webhook authenticity, avoid sensitive data in logs, define retention/deletion policies, and add monitoring. Review `docs/DEPLOYMENT.md` before any deployment. Do not use the assistant for emergency diagnosis.

## Demonstration

Run `npm run demo` for a credential-free scripted interaction. A readable transcript and failure branch are in `docs/SAMPLE_CONVERSATION.md`.

## Manual steps before live use

- Supply OAuth/Vapi/n8n secrets outside Git.
- Run n8n and import/activate both workflows.
- Configure the public HTTPS webhook host and Vapi Custom Credential.
- Complete Google consent and choose the target calendar.
- Execute and observe real end-to-end Vapi calls that create, conflict with, and fail to create Google events.
- Add operational security, logging, alerting, backups, privacy/consent language, and capacity rules.
