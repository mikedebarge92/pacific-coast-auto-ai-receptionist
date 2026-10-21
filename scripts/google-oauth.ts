import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { google } from 'googleapis';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) throw new Error('Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI first.');
const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.freebusy'] });
console.log(`Open this URL in your browser:\n\n${url}\n`);
const rl = createInterface({ input, output });
const code = await rl.question('Paste the returned authorization code: ');
rl.close();
const { tokens } = await client.getToken(code.trim());
if (!tokens.refresh_token) throw new Error('No refresh token returned. Revoke prior consent and rerun with prompt=consent.');
console.log('\nAdd this value to your secret manager or local .env (never commit it):');
console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
