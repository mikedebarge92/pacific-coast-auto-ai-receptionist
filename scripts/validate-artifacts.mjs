import { readFile } from 'node:fs/promises';

for (const file of ['vapi/assistant.json', 'n8n/workflows/availability.json', 'n8n/workflows/booking.json']) {
  const value = JSON.parse(await readFile(file, 'utf8'));
  if (!value || typeof value !== 'object') throw new Error(`${file} is not a JSON object`);
  console.log(`valid JSON: ${file}`);
}
