'use client';

import { CalendarEvent } from '@/lib/api/events';
import EventCard from './EventCard';
import { Calendar as CalendarIcon } from 'lucide-react';

interface EventListProps {
  events: CalendarEvent[];
  onDelete?: (eventId: string) => void;
  onEdit?: (event: CalendarEvent, clickEvent?: React.MouseEvent) => void;
  compact?: boolean;
  title?: string;
  emptyMessage?: string;
}

export default function EventList({
  events,
  onDelete,
  onEdit,
  compact = false,
  title = 'Events',
  emptyMessage = 'No events found'
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl p-12 text-center shadow-xl">
        <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-light">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-light text-gray-900 mb-4">{title}</h3>
      )}

      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        {events.map((event) => (
          <EventCard
            key={event.eventId}
            event={event}
            onDelete={onDelete}
            onEdit={onEdit}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
