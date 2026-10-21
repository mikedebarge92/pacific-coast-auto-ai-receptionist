import { describe, expect, it } from 'vitest';
import { BookingService } from '../src/domain/booking.js';
import { MockCalendarProvider } from '../src/calendar/mock.js';
import type { CalendarEventInput, CalendarProvider } from '../src/domain/types.js';

const valid = { start: '2026-10-22T10:00:00-07:00', service: 'oil_change', customerName: 'Jamie Lee', phone: '949-555-0100', email: 'jamie@example.com', vehicle: '2021 Honda Civic', concern: 'Routine oil change', timezone: 'America/Los_Angeles', idempotencyKey: 'call-12345' } as const;

describe('BookingService', () => {
  it('returns open weekday slots around busy periods', async () => {
    const service = new BookingService(new MockCalendarProvider([{ start: '2026-10-22T16:00:00Z', end: '2026-10-22T17:00:00Z' }]));
    const result = await service.availability({ date: '2026-10-22', service: 'oil_change', timezone: 'America/Los_Angeles' });
    expect(result.available).toBe(true);
    expect(result.slots).not.toContain('2026-10-22T09:00:00.000-07:00');
    expect(result.slots).toContain('2026-10-22T10:00:00.000-07:00');
  });
  it('returns no weekend slots', async () => {
    const result = await new BookingService(new MockCalendarProvider()).availability({ date: '2026-10-24', service: 'brakes' });
    expect(result).toMatchObject({ available: false, reason: 'closed_weekend', slots: [] });
  });
  it('does not confirm a conflicting appointment', async () => {
    const result = await new BookingService(new MockCalendarProvider([{ start: '2026-10-22T17:30:00Z', end: '2026-10-22T18:30:00Z' }])).book(valid);
    expect(result).toEqual({ confirmed: false, reason: 'slot_unavailable' });
  });
  it('confirms only after createEvent succeeds', async () => {
    let created = false;
    const calendar: CalendarProvider = { getBusy: async () => [], findByIdempotencyKey: async () => null, createEvent: async (input: CalendarEventInput) => { created = true; return { id: 'event-1', start: input.start, end: input.end }; } };
    const result = await new BookingService(calendar).book(valid);
    expect(created).toBe(true);
    expect(result).toMatchObject({ confirmed: true, eventId: 'event-1' });
  });
  it('never confirms when calendar creation fails', async () => {
    const calendar: CalendarProvider = { getBusy: async () => [], findByIdempotencyKey: async () => null, createEvent: async () => { throw new Error('upstream unavailable'); } };
    expect(await new BookingService(calendar).book(valid)).toMatchObject({ confirmed: false, reason: 'calendar_create_failed', retryable: true });
  });
  it('rejects missing customer information', async () => {
    await expect(new BookingService(new MockCalendarProvider()).book({ ...valid, phone: '' })).rejects.toThrow();
  });
  it('returns the same event for a repeated idempotency key', async () => {
    const service = new BookingService(new MockCalendarProvider());
    const first = await service.book(valid);
    expect(await service.book(valid)).toEqual(first);
  });
});
