export type ServiceType = 'oil_change' | 'brakes' | 'diagnostics' | 'tire_service' | 'general_maintenance';

export interface BusyPeriod { start: string; end: string }

export interface CalendarEventInput {
  start: string;
  end: string;
  summary: string;
  description: string;
  customerEmail?: string;
  idempotencyKey: string;
}

export interface CalendarEventResult {
  id: string;
  htmlLink?: string;
  start: string;
  end: string;
}

export interface CalendarProvider {
  getBusy(start: string, end: string): Promise<BusyPeriod[]>;
  findByIdempotencyKey(key: string): Promise<CalendarEventResult | null>;
  createEvent(input: CalendarEventInput): Promise<CalendarEventResult>;
}
