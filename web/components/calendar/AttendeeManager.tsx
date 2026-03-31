'use client';

import { useState } from 'react';
import { X, Mail, Phone, User, UserPlus, Contact, ChevronDown, ChevronUp } from 'lucide-react';
import { AttendeeInput } from '@/lib/api/events';
import { UpdateAttendeeRequest } from '@/lib/api/attendees';
import AttendeeSelectionModal from '@/app/calendar/viewer/[id]/components/AttendeeSelectionModal';

interface AttendeeWithId extends AttendeeInput {
  attendeeId?: string; // For existing attendees
}

interface AttendeeManagerProps {
  attendees: AttendeeWithId[];
  onChange: (attendees: AttendeeWithId[]) => void;

  // Quick action handlers (optional - for edit mode)
  calendarId?: string;
  eventId?: string;
  onQuickAdd?: (attendee: AttendeeInput) => Promise<void>;
  onQuickRemove?: (attendeeId: string) => Promise<void>;
  onQuickUpdate?: (attendeeId: string, updates: UpdateAttendeeRequest) => Promise<void>;
}

export default function AttendeeManager({
  attendees,
  onChange,
  calendarId,
  eventId,
  onQuickAdd,
  onQuickRemove,
  onQuickUpdate
}: AttendeeManagerProps) {
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [newAttendee, setNewAttendee] = useState<AttendeeInput>({
    email: '',
    phone: '',
    name: '',
    role: 'attendee',
    status: 'pending'
  });
  const [addMethod, setAddMethod] = useState<'email' | 'phone' | 'contact'>('email');

  // Check if we're in quick mode (editing existing event)
  const isQuickMode = !!(calendarId && eventId && onQuickAdd && onQuickRemove && onQuickUpdate);

  const handleSelectFromContacts = async (attendee: AttendeeInput) => {
    if (isQuickMode) {
      // Quick add - call API immediately
      await onQuickAdd(attendee);
    } else {
      // State-only mode - for create flow
      onChange([...attendees, attendee]);
    }
    setShowSelectionModal(false);
  };

  const handleAddManualAttendee = async () => {
    // Validate at least one identifier is provided
    if (!newAttendee.contactId && !newAttendee.email && !newAttendee.phone) {
      alert('Please provide at least one: Contact, Email, or Phone');
      return;
    }

    if (isQuickMode) {
      // Quick add - call API immediately
      await onQuickAdd(newAttendee);
    } else {
      // State-only mode
      onChange([...attendees, { ...newAttendee }]);
    }

    // Reset form
    setNewAttendee({
      email: '',
      phone: '',
      name: '',
      role: 'attendee',
      status: 'pending'
    });
    setShowManualForm(false);
  };

  const handleRemoveAttendee = async (index: number) => {
    const attendee = attendees[index];

    if (isQuickMode && attendee.attendeeId) {
      // Quick remove - call API immediately
      await onQuickRemove(attendee.attendeeId);
    } else {
      // State-only mode
      const updated = attendees.filter((_, i) => i !== index);
      onChange(updated);
    }
  };

  const handleUpdateAttendee = async (index: number, field: keyof AttendeeInput, value: any) => {
    const attendee = attendees[index];

    if (isQuickMode && attendee.attendeeId && field === 'status') {
      // Quick update status - call API immediately
      await onQuickUpdate(attendee.attendeeId, { [field]: value });
    } else {
      // State-only mode or non-status field
      const updated = [...attendees];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    }
  };

  const getAttendeeDisplayName = (attendee: AttendeeInput) => {
    if (attendee.name) return attendee.name;
    if (attendee.email) return attendee.email;
    if (attendee.phone) return attendee.phone;
    if (attendee.contactId) return `Contact: ${attendee.contactId}`;
    return 'Unknown';
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'organizer':
        return 'bg-purple-100 text-purple-700';
      case 'optional':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const isPrimaryAttendee = (index: number) => {
    return index === 0; // First attendee is primary
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'declined':
        return 'bg-red-100 text-red-700';
      case 'tentative':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          <User className="h-4 w-4 inline mr-1" />
          Attendees
        </label>
      </div>

      {/* Primary Action: Select from Contacts */}
      <button
        type="button"
        onClick={() => setShowSelectionModal(true)}
        className="w-full px-4 py-3 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Add from Contacts
      </button>

      {/* Fallback: Manual Entry - Collapsed by default */}
      <div className="border border-gray-200 rounded-lg">
        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Contact className="h-4 w-4" />
            Or Add Manually
          </span>
          {showManualForm ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showManualForm && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Add by:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddMethod('email')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    addMethod === 'email'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  <Mail className="h-3 w-3 inline mr-1" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setAddMethod('phone')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    addMethod === 'phone'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  <Phone className="h-3 w-3 inline mr-1" />
                  Phone
                </button>
                <button
                  type="button"
                  onClick={() => setAddMethod('contact')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    addMethod === 'contact'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  <Contact className="h-3 w-3 inline mr-1" />
                  Contact
                </button>
              </div>
            </div>

            {/* Contact ID */}
            {addMethod === 'contact' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Contact ID *</label>
                <input
                  type="text"
                  value={newAttendee.contactId || ''}
                  onChange={(e) => setNewAttendee({ ...newAttendee, contactId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter contact ID"
                />
              </div>
            )}

            {/* Email */}
            {addMethod === 'email' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={newAttendee.email || ''}
                  onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="attendee@example.com"
                />
              </div>
            )}

            {/* Phone */}
            {addMethod === 'phone' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={newAttendee.phone || ''}
                  onChange={(e) => setNewAttendee({ ...newAttendee, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            )}

            {/* Name (Optional) */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Name (Optional)</label>
              <input
                type="text"
                value={newAttendee.name || ''}
                onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Role</label>
              <select
                value={newAttendee.role}
                onChange={(e) =>
                  setNewAttendee({
                    ...newAttendee,
                    role: e.target.value as 'organizer' | 'attendee' | 'optional'
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="attendee">Attendee</option>
                <option value="organizer">Organizer</option>
                <option value="optional">Optional</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleAddManualAttendee}
                className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowManualForm(false);
                  setNewAttendee({
                    email: '',
                    phone: '',
                    name: '',
                    role: 'attendee',
                    status: 'pending'
                  });
                }}
                className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendees List */}
      {attendees.length > 0 && (
        <div className="space-y-2">
          {attendees.map((attendee, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {getAttendeeDisplayName(attendee)}
                  </span>
                  {isPrimaryAttendee(index) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      Primary
                    </span>
                  )}
                  {!isPrimaryAttendee(index) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      Guest
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(attendee.role)}`}>
                    {attendee.role || 'attendee'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  {attendee.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {attendee.email}
                    </span>
                  )}
                  {attendee.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {attendee.phone}
                    </span>
                  )}
                  {attendee.contactId && (
                    <span className="flex items-center gap-1">
                      <Contact className="h-3 w-3" />
                      ID: {attendee.contactId}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Dropdown */}
                <select
                  value={attendee.status}
                  onChange={(e) =>
                    handleUpdateAttendee(
                      index,
                      'status',
                      e.target.value as 'pending' | 'accepted' | 'declined' | 'tentative'
                    )
                  }
                  className={`text-xs px-2 py-1 rounded-md border-0 focus:ring-2 focus:ring-blue-500 ${getStatusBadgeColor(
                    attendee.status
                  )}`}
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="tentative">Tentative</option>
                </select>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveAttendee(index)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {attendees.length === 0 && (
        <p className="text-sm text-gray-500 italic text-center py-4">
          No attendees added yet
        </p>
      )}

      {/* Attendee Selection Modal */}
      <AttendeeSelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        onSelectContact={handleSelectFromContacts}
      />
    </div>
  );
}
