import { config } from '../config.js';
import { GoogleCalendarProvider } from './google.js';
import { MockCalendarProvider } from './mock.js';

export function createCalendar() {
  if (config.CALENDAR_MODE === 'mock') return new MockCalendarProvider();
  const required = [config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI, config.GOOGLE_REFRESH_TOKEN];
  if (required.some((value) => !value)) throw new Error('Google Calendar mode requires OAuth client, redirect URI, and refresh token settings');
  return new GoogleCalendarProvider(config.GOOGLE_CALENDAR_ID, required[0]!, required[1]!, required[2]!, required[3]!);
}
