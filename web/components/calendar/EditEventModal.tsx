'use client';

import { useState, useEffect } from 'react';
import { X, Clock, MapPin, Tag } from 'lucide-react';
import { CalendarEvent, UpdateEventRequest, EventType } from '@/lib/api/events';
import { attendeesAPI, AttendeeResponse, AddAttendeeRequest, UpdateAttendeeRequest } from '@/lib/api/attendees';
import AttendeeManager from './AttendeeManager';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventId: string, updates: UpdateEventRequest) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  event: CalendarEvent | null;
  clickPosition?: { x: number; y: number } | null;
}

export default function EditEventModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  event,
  clickPosition
}: EditEventModalProps) {
  const [updating, setUpdating] = useState(false);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendees, setAttendees] = useState<AttendeeResponse[]>([]);
  const [isEditingFull, setIsEditingFull] = useState(false);
  const [formData, setFormData] = useState<UpdateEventRequest>({
    eventName: '',
    eventType: 'meeting',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    color: '#3B82F6',
    isAllDay: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Auto-detect user's timezone
  });

  // Fetch attendees when modal opens
  useEffect(() => {
    if (isOpen && event) {
      fetchAttendees();
      setFormData({
        eventName: event.eventName,
        eventType: event.eventType,
        description: event.description || '',
        startTime: formatDateTimeLocal(new Date(event.startTime)),
        endTime: formatDateTimeLocal(new Date(event.endTime)),
        location: event.location || '',
        color: event.color || '#3B82F6',
        isAllDay: event.isAllDay || false,
        timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone // Use event's timezone or auto-detect
      });
    }
  }, [isOpen, event]);

  const fetchAttendees = async () => {
    if (!event) return;

    try {
      setLoadingAttendees(true);
      const data = await attendeesAPI.getAttendees(event.calendarId, event.eventId);
      setAttendees(data);
    } catch (error) {
      console.error('Error fetching attendees:', error);
    } finally {
      setLoadingAttendees(false);
    }
  };

  if (!isOpen || !event) return null;

  function formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.eventName?.trim()) {
      alert('Event name is required');
      return;
    }

    try {
      setUpdating(true);

      // Convert local datetime to ISO string
      const eventData: UpdateEventRequest = {
        ...formData,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined
      };

      await onSubmit(event.eventId, eventData);
      onClose();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event');
    } finally {
      setUpdating(false);
    }
  };

  // Quick add attendee handler
  const handleQuickAddAttendee = async (attendee: AddAttendeeRequest) => {
    if (!event) return;

    try {
      const created = await attendeesAPI.addAttendees(
        event.calendarId,
        event.eventId,
        attendee
      );
      setAttendees([...attendees, ...created]);
    } catch (error) {
      console.error('Error adding attendee:', error);
      alert('Failed to add attendee');
      throw error;
    }
  };

  // Quick remove attendee handler
  const handleQuickRemoveAttendee = async (attendeeId: string) => {
    if (!event) return;

    if (!confirm('Remove this attendee?')) {
      return;
    }

    try {
      await attendeesAPI.removeAttendee(event.calendarId, event.eventId, attendeeId);
      setAttendees(attendees.filter(a => a.attendeeId !== attendeeId));
    } catch (error) {
      console.error('Error removing attendee:', error);
      alert('Failed to remove attendee');
      throw error;
    }
  };

  // Quick update attendee handler
  const handleQuickUpdateAttendee = async (
    attendeeId: string,
    updates: UpdateAttendeeRequest
  ) => {
    if (!event) return;

    try {
      await attendeesAPI.updateAttendee(
        event.calendarId,
        event.eventId,
        attendeeId,
        updates
      );
      setAttendees(attendees.map(a =>
        a.attendeeId === attendeeId ? { ...a, ...updates } : a
      ));
    } catch (error) {
      console.error('Error updating attendee:', error);
      alert('Failed to update attendee');
      throw error;
    }
  };

  const eventTypes: { value: EventType; label: string; color: string }[] = [
    { value: 'meeting', label: 'Meeting', color: '#3B82F6' },
    { value: 'call', label: 'Call', color: '#10B981' },
    { value: 'video', label: 'Video', color: '#8B5CF6' },
    { value: 'task', label: 'Task', color: '#F59E0B' },
    { value: 'reminder', label: 'Reminder', color: '#EF4444' },
    { value: 'appointment', label: 'Appointment', color: '#06B6D4' }
  ];

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#10B981', label: 'Green' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EF4444', label: 'Red' },
    { value: '#EC4899', label: 'Pink' }
  ];

  // Calculate modal position based on click
  const getModalStyle = () => {
    if (!clickPosition) {
      // Default centered position
      return {};
    }

    const modalWidth = 480;
    const modalMaxHeight = window.innerHeight * 0.8;
    const padding = 20;

    // Determine if click was on left or right side of screen
    const isLeftSide = clickPosition.x < window.innerWidth / 2;

    let left, right, top;

    if (isLeftSide) {
      // Position to the right of click
      left = Math.min(clickPosition.x + padding, window.innerWidth - modalWidth - padding);
    } else {
      // Position to the left of click
      right = Math.min(window.innerWidth - clickPosition.x + padding, window.innerWidth - modalWidth - padding);
    }

    // Position vertically near click but ensure it fits
    top = Math.max(padding, Math.min(clickPosition.y, window.innerHeight - modalMaxHeight - padding));

    return {
      position: 'fixed' as const,
      left: left !== undefined ? `${left}px` : undefined,
      right: right !== undefined ? `${right}px` : undefined,
      top: `${top}px`,
      width: `${modalWidth}px`,
      maxHeight: `${modalMaxHeight}px`,
    };
  };

  const isPositioned = !!clickPosition;

  // Quick view (Google Calendar style)
  if (!isEditingFull) {
    return (
      <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
          style={isPositioned ? getModalStyle() : { maxWidth: '420px', width: '100%' }}
        >
          {/* Header with actions */}
          <div className="flex items-center justify-end gap-2 p-3 border-b border-gray-100">
            <button
              onClick={() => setIsEditingFull(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {onDelete && (
              <button
                onClick={async () => {
                  if (event) {
                    await onDelete(event.eventId);
                    onClose();
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Delete"
              >
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Color indicator and title */}
            <div className="flex items-start gap-3">
              <div
                className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: event.color || '#3B82F6' }}
              />
              <div className="flex-1">
                <h2 className="text-xl font-normal text-gray-900 mb-1">
                  {event.eventName}
                </h2>
                <p className="text-sm text-gray-600">
                  {new Date(event.startTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                {new Date(event.startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })} – {new Date(event.endTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>{event.location}</div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="h-5 w-5 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <div>{event.description}</div>
              </div>
            )}

            {/* Event type badge */}
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-gray-500 mt-0.5" />
              <span className="text-sm px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                {event.eventType}
              </span>
            </div>

            {/* Attendees summary */}
            {loadingAttendees ? (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                Loading attendees...
              </div>
            ) : attendees.length > 0 && (
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="h-5 w-5 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <div className="font-medium mb-1">{attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}</div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {attendees.slice(0, 3).map((attendee, idx) => (
                      <div key={idx}>{attendee.name || attendee.email || attendee.phone}</div>
                    ))}
                    {attendees.length > 3 && (
                      <div className="text-gray-500">+{attendees.length - 3} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full edit form
  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl overflow-y-auto"
        style={{ maxWidth: '1200px', width: '100%', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-gray-900">Edit Event</h2>
          <button
            onClick={() => setIsEditingFull(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={formData.eventName}
              onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Team Meeting"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, eventType: type.value })}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    formData.eventType === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Tag className="h-4 w-4 inline mr-2" style={{ color: type.color }} />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Start Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                End Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.isAllDay}
              onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
              className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700">
              All day event
            </label>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Office, Zoom, etc."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event details..."
              rows={3}
            />
          </div>

          {/* Attendees */}
          {loadingAttendees ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading attendees...</p>
            </div>
          ) : (
            <AttendeeManager
              attendees={attendees}
              onChange={() => {}} // No-op in edit mode since we use quick actions
              calendarId={event?.calendarId}
              eventId={event?.eventId}
              onQuickAdd={handleQuickAddAttendee}
              onQuickRemove={handleQuickRemoveAttendee}
              onQuickUpdate={handleQuickUpdateAttendee}
            />
          )}

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Color
            </label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-10 h-10 rounded-lg transition-all duration-200 ${
                    formData.color === color.value
                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-light"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !formData.eventName?.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
