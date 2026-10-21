import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MockCalendarProvider } from '../src/calendar/mock.js';

const app = createApp(new MockCalendarProvider());

describe('HTTP API', () => {
  it('serves the portfolio dashboard', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Take the receptionist for a test drive');
  });
  it('reports health', async () => expect((await request(app).get('/health')).body).toMatchObject({ status: 'ok' }));
  it('validates malformed bookings', async () => {
    const response = await request(app).post('/api/book').send({});
    expect(response.status).toBe(400);
  });
  it('returns Vapi tool-call result shape', async () => {
    const response = await request(app).post('/vapi/webhook').send({ message: { toolCallList: [{ id: 'tool-1', function: { name: 'check_availability', arguments: { date: '2026-10-22', service: 'oil_change' } } }] } });
    const body = response.body as { results: Array<{ toolCallId: string }> };
    expect(body.results[0]?.toolCallId).toBe('tool-1');
  });
  it('runs the isolated credential-free demo API', async () => {
    const response = await request(app).post('/demo/api/availability').send({ date: '2026-10-22', service: 'oil_change' });
    expect(response.status).toBe(200);
    expect(response.body.available).toBe(true);
  });
});
