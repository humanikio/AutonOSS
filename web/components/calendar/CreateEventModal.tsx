'use client';

import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, Users, Tag } from 'lucide-react';
import { CreateEventRequest, EventType, AttendeeInput } from '@/lib/api/events';
import AttendeeManager from './AttendeeManager';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: CreateEventRequest) => Promise<void>;
  selectedDate?: Date;
  clickPosition?: { x: number; y: number } | null;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  clickPosition
}: CreateEventModalProps) {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CreateEventRequest>({
    eventName: '',
    eventType: 'meeting',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: [],
    color: '#3B82F6',
    isAllDay: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Auto-detect user's timezone
  });

  // Update form data when modal opens or selectedDate changes
  useEffect(() => {
    if (isOpen) {
      // Use the clicked date/time directly from selectedDate
      let startDateTime: Date;

      if (!selectedDate) {
        // If no date selected, use current time
        startDateTime = new Date();
        startDateTime.setSeconds(0);
        startDateTime.setMilliseconds(0);
      } else {
        // Use selectedDate directly - it's already a Date object with correct time
        startDateTime = selectedDate;
      }

      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour later

      setFormData({
        eventName: '',
        eventType: 'meeting',
        description: '',
        startTime: formatDateTimeLocal(startDateTime),
        endTime: formatDateTimeLocal(endDateTime),
        location: '',
        attendees: [],
        color: '#3B82F6',
        isAllDay: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Auto-detect user's timezone
      });
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

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

    if (!formData.eventName.trim()) {
      alert('Event name is required');
      return;
    }

    try {
      setCreating(true);

      // Parse datetime-local strings (format: "2025-12-01T14:00")
      // These are in local time, we need to preserve the exact date/time when converting to ISO
      const parseLocalDateTime = (dateTimeString: string): string => {
        console.log('Parsing datetime string:', dateTimeString);
        // Split the datetime-local string
        const [datePart, timePart] = dateTimeString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        // Create date using UTC to avoid timezone conversion
        const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
        console.log('Created UTC date:', utcDate.toISOString());
        return utcDate.toISOString();
      };

      console.log('Form data:', formData);
      const startISO = parseLocalDateTime(formData.startTime);
      const endISO = parseLocalDateTime(formData.endTime);
      console.log('Start ISO:', startISO);
      console.log('End ISO:', endISO);

      // Validate end time is after start time
      if (new Date(endISO) <= new Date(startISO)) {
        alert('End time must be after start time');
        setCreating(false);
        return;
      }

      // Convert local datetime to ISO string
      const eventData: CreateEventRequest = {
        ...formData,
        startTime: startISO,
        endTime: endISO
      };

      console.log('Submitting event data:', eventData);
      await onSubmit(eventData);
      console.log('Event created successfully!');

      // Reset form
      setFormData({
        eventName: '',
        eventType: 'meeting',
        description: '',
        startTime: formatDateTimeLocal(new Date()),
        endTime: formatDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
        location: '',
        attendees: [],
        color: '#3B82F6',
        isAllDay: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Auto-detect user's timezone
      });
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleAttendeesChange = (attendees: AttendeeInput[]) => {
    setFormData({
      ...formData,
      attendees
    });
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

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col"
        style={isPositioned ? getModalStyle() : { maxWidth: '1200px', width: '100%', maxHeight: '90vh' }}
      >
        {/* Header - Sticky */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-light text-gray-900">Create Event</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
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
                onChange={(e) => {
                  const newStartTime = e.target.value;
                  const startDate = new Date(newStartTime);
                  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

                  setFormData({
                    ...formData,
                    startTime: newStartTime,
                    endTime: formatDateTimeLocal(endDate)
                  });
                }}
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
          <AttendeeManager
            attendees={formData.attendees || []}
            onChange={handleAttendeesChange}
          />

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
          </div>

          {/* Submit Buttons - Sticky */}
          <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-light"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !formData.eventName.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
