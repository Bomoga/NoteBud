import { apiClient } from './client';

export type EventType = 'due_date' | 'exam' | 'holiday' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date: "YYYY-MM-DD"
  event_type: EventType;
  description?: string | null;
  notebook_id?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventCreate {
  title: string;
  date: string;
  event_type: EventType;
  description?: string | null;
  notebook_id?: string | null;
}

export interface CalendarEventUpdate {
  title?: string;
  date?: string;
  event_type?: EventType;
  description?: string | null;
  notebook_id?: string | null;
}

export async function listEvents(): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<CalendarEvent[]>('/events');
  return data;
}

export async function createEvent(payload: CalendarEventCreate): Promise<CalendarEvent> {
  const { data } = await apiClient.post<CalendarEvent>('/events', payload);
  return data;
}

export async function updateEvent(id: string, payload: CalendarEventUpdate): Promise<CalendarEvent> {
  const { data } = await apiClient.patch<CalendarEvent>(`/events/${id}`, payload);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/events/${id}`);
}
