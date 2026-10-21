import { BookingService } from '../src/domain/booking.js';
import { MockCalendarProvider } from '../src/calendar/mock.js';

const booking = new BookingService(new MockCalendarProvider([{ start: '2026-10-22T16:00:00Z', end: '2026-10-22T17:00:00Z' }]));
console.log('Caller: I need an oil change next Thursday morning.');
const availability = await booking.availability({ date: '2026-10-22', service: 'oil_change', timezone: 'America/Los_Angeles' });
console.log('Tool — check_availability:', JSON.stringify(availability, null, 2));
const selected = availability.slots.find((slot) => slot.includes('10:00:00'))!;
console.log(`Receptionist: I have ${selected}. May I book that for you?`);
console.log('Caller: Yes. Jamie Lee, 949-555-0100, 2021 Honda Civic.');
const result = await booking.book({ start: selected, service: 'oil_change', customerName: 'Jamie Lee', phone: '949-555-0100', email: 'jamie@example.com', vehicle: '2021 Honda Civic', concern: 'Routine oil change', timezone: 'America/Los_Angeles', idempotencyKey: 'demo-call-20261022-1000' });
console.log('Tool — book_appointment:', JSON.stringify(result, null, 2));
console.log(result.confirmed ? 'Receptionist: Your appointment is confirmed.' : 'Receptionist: I could not confirm that appointment.');
