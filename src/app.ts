import express, { type Request, type Response, type NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from './config.js';
import { BookingService } from './domain/booking.js';
import type { CalendarProvider } from './domain/types.js';
import { MockCalendarProvider } from './calendar/mock.js';

function auth(req: Request, res: Response, next: NextFunction) {
  if (!config.VAPI_WEBHOOK_TOKEN || req.path === '/health') return next();
  if (req.header('authorization') !== `Bearer ${config.VAPI_WEBHOOK_TOKEN}`) return res.status(401).json({ error: 'unauthorized' });
  next();
}

export function createApp(calendar: CalendarProvider) {
  const app = express();
  const booking = new BookingService(calendar, config.BUSINESS_TIMEZONE);
  const demoBooking = new BookingService(new MockCalendarProvider(), config.BUSINESS_TIMEZONE);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static('public'));
  app.post('/demo/api/availability', async (req, res, next) => { try { res.json(await demoBooking.availability(req.body)); } catch (e) { next(e); } });
  app.post('/demo/api/book', async (req, res, next) => { try { res.json(await demoBooking.book(req.body)); } catch (e) { next(e); } });
  app.use(auth);
  app.get('/health', (_req, res) => res.json({ status: 'ok', calendarMode: config.CALENDAR_MODE }));
  app.post('/api/availability', async (req, res, next) => { try { res.json(await booking.availability(req.body)); } catch (e) { next(e); } });
  app.post('/api/book', async (req, res, next) => { try { res.json(await booking.book(req.body)); } catch (e) { next(e); } });
  app.post('/vapi/webhook', async (req, res, next) => {
    try {
      const calls = req.body?.message?.toolCallList ?? req.body?.message?.toolCalls ?? [];
      const results = [];
      for (const call of calls) {
        const name = call.function?.name ?? call.name;
        const args = typeof call.function?.arguments === 'string' ? JSON.parse(call.function.arguments) : (call.function?.arguments ?? call.arguments ?? {});
        const result = name === 'check_availability' ? await booking.availability(args) : name === 'book_appointment' ? await booking.book(args) : { error: 'unknown_tool' };
        results.push({ toolCallId: call.id, result: JSON.stringify(result) });
      }
      res.json({ results });
    } catch (e) { next(e); }
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) return res.status(400).json({ error: 'invalid_request', issues: error.issues });
    console.error(error);
    res.status(500).json({ error: 'internal_error' });
  });
  return app;
}
