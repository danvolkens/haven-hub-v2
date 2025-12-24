'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { ContentCalendar } from '@/components/calendar/content-calendar';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent } from '@/hooks/use-calendar';
import { format } from 'date-fns';

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <PageContainer
      title="Content Calendar"
      description="View all scheduled content in one place"
    >
      <ContentCalendar onEventClick={setSelectedEvent} />

      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Event Details'}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge>{selectedEvent.type.replace('_', ' ')}</Badge>
              <Badge variant="secondary">{selectedEvent.status}</Badge>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
              <div className="font-medium">
                {format(new Date(selectedEvent.scheduled_at), 'PPpp')}
              </div>
            </div>

            {selectedEvent.description && (
              <div>
                <div className="text-sm text-muted-foreground">Description</div>
                <div>{selectedEvent.description}</div>
              </div>
            )}

            {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Details</div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  {Object.entries(selectedEvent.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">
                        {key.replace('_', ' ')}:
                      </span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
