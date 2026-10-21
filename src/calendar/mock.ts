import { randomUUID } from 'node:crypto';
import type { BusyPeriod, CalendarEventInput, CalendarEventResult, CalendarProvider } from '../domain/types.js';

export class MockCalendarProvider implements CalendarProvider {
  private events = new Map<string, CalendarEventResult & { key: string }>();
  constructor(private readonly seededBusy: BusyPeriod[] = []) {}

  async getBusy(start: string, end: string): Promise<BusyPeriod[]> {
    const from = Date.parse(start), to = Date.parse(end);
    return [...this.seededBusy, ...this.events.values()].filter((e) => Date.parse(e.start) < to && Date.parse(e.end) > from);
  }

  async findByIdempotencyKey(key: string): Promise<CalendarEventResult | null> {
    return [...this.events.values()].find((event) => event.key === key) ?? null;
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;
    if (process.env.MOCK_CALENDAR_FAIL === 'true') throw new Error('Simulated calendar failure');
    const event = { id: `mock-${randomUUID()}`, htmlLink: 'http://localhost/mock-calendar', start: input.start, end: input.end, key: input.idempotencyKey };
    this.events.set(event.id, event);
    return event;
  }
}
