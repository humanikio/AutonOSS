'use client';

import { CalendarEvent } from '@/lib/api/events';
import { Clock, MapPin, Users, Video, Phone, CheckSquare, Bell, Calendar as CalendarIcon, Trash2, Edit2 } from 'lucide-react';

interface EventCardProps {
  event: CalendarEvent;
  onDelete?: (eventId: string) => void;
  onEdit?: (event: CalendarEvent, clickEvent?: React.MouseEvent) => void;
  compact?: boolean;
}

export default function EventCard({ event, onDelete, onEdit, compact = false }: EventCardProps) {
  const getEventIcon = () => {
    switch (event.eventType) {
      case 'video':
        return Video;
      case 'call':
        return Phone;
      case 'meeting':
        return Users;
      case 'task':
        return CheckSquare;
      case 'reminder':
        return Bell;
      case 'appointment':
        return CalendarIcon;
      default:
        return CalendarIcon;
    }
  };

  const Icon = getEventIcon();

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (compact) {
    return (
      <div
        onClick={(e) => onEdit?.(event, e)}
        className="backdrop-blur-lg bg-white/70 border border-white/60 rounded-xl p-3 hover:bg-white/80 transition-all duration-300 cursor-pointer group"
        style={{ borderLeftWidth: '4px', borderLeftColor: event.color || '#3B82F6' }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: event.color || '#3B82F6' }}
            >
              <Icon className="h-3 w-3 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">{event.eventName}</h4>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                <Clock className="h-3 w-3" />
                <span>{formatTime(event.startTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl p-6 hover:bg-white/80 transition-all duration-300 shadow-lg group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className="p-3 rounded-xl shadow-lg"
            style={{ backgroundColor: event.color || '#3B82F6' }}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-light text-gray-900 mb-1">{event.eventName}</h3>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
              {event.eventType}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => onEdit(event, e)}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4 text-blue-600" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(event.eventId)}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>

      {event.description && (
        <p className="text-sm text-gray-600 font-light mb-4">{event.description}</p>
      )}

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>
            {formatDate(event.startTime)} · {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <div className="flex flex-wrap gap-1">
              {event.attendees.slice(0, 3).map((attendee, idx) => {
                const displayName = attendee.name || attendee.email || attendee.phone || `Contact: ${attendee.contactId}`;
                return (
                  <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {displayName}
                  </span>
                );
              })}
              {event.attendees.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  +{event.attendees.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
