'use client';

import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface CalendarEvent {
  id: string;
  type: 'pin' | 'email' | 'campaign_task' | 'campaign_milestone';
  title: string;
  description?: string;
  scheduled_at: string;
  status: string;
  metadata: Record<string, any>;
}

export function useCalendarEvents(month: Date) {
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end = format(endOfMonth(month), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calendar', start, end],
    queryFn: async () => {
      const response = await fetch(
        `/api/calendar?start=${start}&end=${end}`
      );
      if (!response.ok) throw new Error('Failed to fetch calendar');
      return response.json() as Promise<{ events: CalendarEvent[] }>;
    },
  });
}
