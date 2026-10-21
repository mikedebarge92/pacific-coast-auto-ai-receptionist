import { google } from 'googleapis';
import type { CalendarEventInput, CalendarProvider } from '../domain/types.js';

export class GoogleCalendarProvider implements CalendarProvider {
  private readonly calendar;
  constructor(private readonly calendarId: string, clientId: string, clientSecret: string, redirectUri: string, refreshToken: string) {
    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({ refresh_token: refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async getBusy(start: string, end: string) {
    const response = await this.calendar.freebusy.query({ requestBody: { timeMin: start, timeMax: end, items: [{ id: this.calendarId }] } });
    return response.data.calendars?.[this.calendarId]?.busy?.flatMap((p) => p.start && p.end ? [{ start: p.start, end: p.end }] : []) ?? [];
  }

  async findByIdempotencyKey(key: string) {
    const response = await this.calendar.events.list({ calendarId: this.calendarId, privateExtendedProperty: [`bookingKey=${key}`], maxResults: 1, singleEvents: true });
    const found = response.data.items?.[0];
    if (!found?.id || !found.start?.dateTime || !found.end?.dateTime) return null;
    return { id: found.id, htmlLink: found.htmlLink ?? undefined, start: found.start.dateTime, end: found.end.dateTime };
  }

  async createEvent(input: CalendarEventInput) {
    const found = await this.findByIdempotencyKey(input.idempotencyKey);
    if (found) return found;
    const response = await this.calendar.events.insert({
      calendarId: this.calendarId,
      sendUpdates: input.customerEmail ? 'all' : 'none',
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start },
        end: { dateTime: input.end },
        attendees: input.customerEmail ? [{ email: input.customerEmail }] : undefined,
        extendedProperties: { private: { bookingKey: input.idempotencyKey } }
      }
    });
    if (!response.data.id || !response.data.start?.dateTime || !response.data.end?.dateTime) throw new Error('Google Calendar returned an incomplete event');
    return { id: response.data.id, htmlLink: response.data.htmlLink ?? undefined, start: response.data.start.dateTime, end: response.data.end.dateTime };
  }
}
