# Deployment checklist

1. Put secrets in the deployment platform's secret manager; never bake `.env` into an image.
2. Terminate TLS at a reverse proxy and expose only n8n's webhook routes publicly.
3. Set a strong n8n encryption key and admin password, restrict the editor UI, and back up the n8n volume.
4. Use a dedicated Google Calendar and OAuth client with the two narrow Calendar scopes documented in the README.
5. Configure a Vapi Custom Credential for the bearer token and attach it to both function tools.
6. Set production webhook URLs, import and activate the workflows, then run end-to-end test calls.
7. Add structured logs, uptime checks, alerting, secret rotation, retention policies, and a privacy notice before handling real customer data.
