import { DateTime, Interval } from 'luxon';
import { z } from 'zod';
import type { CalendarProvider, ServiceType } from './types.js';

export const serviceDurations: Record<ServiceType, number> = {
  oil_change: 60,
  brakes: 120,
  diagnostics: 90,
  tire_service: 90,
  general_maintenance: 90
};

const serviceSchema = z.enum(['oil_change', 'brakes', 'diagnostics', 'tire_service', 'general_maintenance']);
export const availabilitySchema = z.object({
  date: z.string().min(1),
  service: serviceSchema,
  timezone: z.string().default('America/Los_Angeles')
});
export const bookingSchema = z.object({
  start: z.string().min(1),
  service: serviceSchema,
  customerName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  email: z.string().email().optional(),
  vehicle: z.string().trim().min(2),
  concern: z.string().trim().min(2),
  timezone: z.string().default('America/Los_Angeles'),
  idempotencyKey: z.string().trim().min(8)
});

export class BookingService {
  constructor(private readonly calendar: CalendarProvider, private readonly businessZone = 'America/Los_Angeles') {}

  async availability(raw: unknown) {
    const input = availabilitySchema.parse(raw);
    const requested = DateTime.fromISO(input.date, { zone: input.timezone }).setZone(this.businessZone);
    if (!requested.isValid) throw new Error('Invalid date or timezone');
    if (requested.weekday > 5) return { available: false, slots: [], reason: 'closed_weekend', timezone: this.businessZone };

    const open = requested.startOf('day').set({ hour: 8 });
    const close = requested.startOf('day').set({ hour: 18 });
    const duration = serviceDurations[input.service];
    const busy = await this.calendar.getBusy(open.toUTC().toISO()!, close.toUTC().toISO()!);
    const busyIntervals = busy.map((b) => Interval.fromDateTimes(DateTime.fromISO(b.start), DateTime.fromISO(b.end)));
    const slots: string[] = [];
    for (let cursor = open; cursor.plus({ minutes: duration }) <= close; cursor = cursor.plus({ minutes: 30 })) {
      const candidate = Interval.fromDateTimes(cursor.toUTC(), cursor.plus({ minutes: duration }).toUTC());
      if (!busyIntervals.some((period) => period.overlaps(candidate))) slots.push(cursor.toISO()!);
    }
    return { available: slots.length > 0, slots, timezone: this.businessZone, durationMinutes: duration };
  }

  async book(raw: unknown) {
    const input = bookingSchema.parse(raw);
    const localStart = DateTime.fromISO(input.start, { zone: input.timezone }).setZone(this.businessZone);
    if (!localStart.isValid) throw new Error('Invalid appointment start or timezone');
    const duration = serviceDurations[input.service];
    const localEnd = localStart.plus({ minutes: duration });
    if (localStart.weekday > 5 || localStart.hour < 8 || localEnd > localStart.startOf('day').set({ hour: 18 })) {
      return { confirmed: false, reason: 'outside_business_hours' };
    }
    const start = localStart.toUTC().toISO()!;
    const end = localEnd.toUTC().toISO()!;
    const existing = await this.calendar.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return { confirmed: true, eventId: existing.id, calendarLink: existing.htmlLink, start: existing.start, end: existing.end, timezone: this.businessZone };
    const conflicts = await this.calendar.getBusy(start, end);
    if (conflicts.length) return { confirmed: false, reason: 'slot_unavailable' };

    try {
      const event = await this.calendar.createEvent({
        start,
        end,
        summary: `${input.service.replaceAll('_', ' ')} — ${input.customerName}`,
        description: `Customer: ${input.customerName}\nPhone: ${input.phone}\nVehicle: ${input.vehicle}\nConcern: ${input.concern}`,
        customerEmail: input.email,
        idempotencyKey: input.idempotencyKey
      });
      return { confirmed: true, eventId: event.id, calendarLink: event.htmlLink, start: event.start, end: event.end, timezone: this.businessZone };
    } catch (error) {
      return { confirmed: false, reason: 'calendar_create_failed', retryable: true, message: error instanceof Error ? error.message : 'Unknown calendar error' };
    }
  }
}
