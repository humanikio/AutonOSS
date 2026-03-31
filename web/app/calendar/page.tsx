'use client';

import {
  Calendar as CalendarIcon,
  Plus,
  ArrowRight,
  Clock,
  MoreVertical,
  Trash2,
  Edit2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { calendarsAPI, Calendar, CreateCalendarRequest } from '@/lib/api/calendars';
import { setTokenGetter } from '@/lib/api/client';

export default function CalendarListPage() {
  const router = useRouter();
  const { currentTenantId, getToken } = useAuth();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCalendar, setNewCalendar] = useState<CreateCalendarRequest>({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  // Set token getter for API client
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Fetch calendars
  useEffect(() => {
    if (currentTenantId) {
      fetchCalendars();
    }
  }, [currentTenantId]);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      const data = await calendarsAPI.getCalendars();
      setCalendars(data);
    } catch (error) {
      console.error('Error fetching calendars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCalendar.name.trim()) {
      return;
    }

    try {
      setCreating(true);
      const created = await calendarsAPI.createCalendar(newCalendar);

      // Navigate to the viewer for the newly created calendar
      router.push(`/calendar/viewer/${created.calendarId}`);
    } catch (error) {
      console.error('Error creating calendar:', error);
      alert('Failed to create calendar');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCalendar = async (calendarId: string) => {
    if (!confirm('Are you sure you want to delete this calendar?')) {
      return;
    }

    try {
      await calendarsAPI.deleteCalendar(calendarId);
      await fetchCalendars();
    } catch (error) {
      console.error('Error deleting calendar:', error);
      alert('Failed to delete calendar');
    }
  };

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#10B981', label: 'Green' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EF4444', label: 'Red' },
    { value: '#EC4899', label: 'Pink' }
  ];

  return (
    <>
      {/* Full-screen background */}
      <div className="fixed inset-0 bg-gray-50 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-cyan-50/15 to-blue-50/10"></div>

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-96 -right-96 w-[1000px] h-[1000px] bg-gradient-to-br from-blue-200/35 to-cyan-300/25 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-96 -left-96 w-[900px] h-[900px] bg-gradient-to-tr from-cyan-200/30 to-blue-300/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-100/15 to-blue-100/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-extralight text-gray-900 mb-3">Calendars</h1>
            <p className="text-gray-600 text-lg font-light max-w-md mx-auto">
              Manage your calendars and sync with external providers
            </p>
          </div>

          {/* Create Calendar Button */}
          <div className="mb-8 flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="backdrop-blur-lg bg-blue-500/90 hover:bg-blue-600/90 border border-blue-400/50 text-white px-6 py-3 rounded-xl font-light transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              <span>New Calendar</span>
            </button>
          </div>

          {/* Calendars Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-light">Loading calendars...</p>
            </div>
          ) : calendars.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl p-12 text-center shadow-xl">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-light text-gray-900 mb-2">No calendars yet</h3>
              <p className="text-gray-600 font-light mb-6">
                Create your first calendar to get started
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="backdrop-blur-lg bg-blue-500/90 hover:bg-blue-600/90 border border-blue-400/50 text-white px-6 py-3 rounded-xl font-light transition-all duration-300 inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Create Calendar</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {calendars.map((calendar) => (
                <div
                  key={calendar.calendarId}
                  className="group relative backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl p-6 hover:bg-white/75 transition-all duration-500 shadow-xl hover:shadow-2xl hover:shadow-blue-200/20 cursor-pointer"
                  onClick={() => router.push(`/calendar/viewer/${calendar.calendarId}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-3 rounded-xl shadow-lg"
                        style={{ backgroundColor: calendar.color || '#3B82F6' }}
                      >
                        <CalendarIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-light text-gray-900 group-hover:text-blue-700 transition-colors">
                          {calendar.name}
                        </h3>
                        {calendar.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCalendar(calendar.calendarId);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {calendar.description && (
                    <p className="text-sm text-gray-600 font-light mb-4 line-clamp-2">
                      {calendar.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(calendar.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Calendar Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-white/90 border border-white/60 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-light text-gray-900 mb-6">Create New Calendar</h2>

            <form onSubmit={handleCreateCalendar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calendar Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCalendar.name}
                  onChange={(e) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Calendar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newCalendar.description}
                  onChange={(e) => setNewCalendar({ ...newCalendar, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewCalendar({ ...newCalendar, color: color.value })}
                      className={`w-10 h-10 rounded-lg transition-all duration-200 ${
                        newCalendar.color === color.value
                          ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCalendar({ name: '', description: '', color: '#3B82F6' });
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-light"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newCalendar.name.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
