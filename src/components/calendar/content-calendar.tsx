'use client';

import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCalendarEvents, CalendarEvent } from '@/hooks/use-calendar';
import { ChevronLeft, ChevronRight, Pin, Mail, Flag, Calendar } from 'lucide-react';

const EVENT_COLORS: Record<string, string> = {
  pin: 'bg-red-100 text-red-700 border-red-200',
  email: 'bg-blue-100 text-blue-700 border-blue-200',
  campaign_task: 'bg-purple-100 text-purple-700 border-purple-200',
  campaign_milestone: 'bg-green-100 text-green-700 border-green-200',
};

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pin: Pin,
  email: Mail,
  campaign_task: Flag,
  campaign_milestone: Calendar,
};

interface ContentCalendarProps {
  onEventClick?: (event: CalendarEvent) => void;
}

export function ContentCalendar({ onEventClick }: ContentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data, isLoading } = useCalendarEvents(currentMonth);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    data?.events.forEach(event => {
      const dateKey = format(new Date(event.scheduled_at), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, event]);
    });

    return map;
  }, [data?.events]);

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        {Object.entries(EVENT_ICONS).map(([type, Icon]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`p-1 rounded ${EVENT_COLORS[type]}`}>
              <Icon className="h-3 w-3" />
            </div>
            <span className="capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={index}
                className={`min-h-[120px] border-b border-r p-2 ${
                  !isCurrentMonth ? 'bg-gray-50 text-muted-foreground' : ''
                } ${isToday ? 'bg-sage-50' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-sage-600' : ''
                }`}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => {
                    const Icon = EVENT_ICONS[event.type];
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`w-full text-left text-xs p-1.5 rounded border truncate flex items-center gap-1 hover:opacity-80 transition-opacity ${EVENT_COLORS[event.type]}`}
                      >
                        <Icon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{event.title}</span>
                      </button>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
