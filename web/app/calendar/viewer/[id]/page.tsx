'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent, CreateEventRequest, UpdateEventRequest } from '@/lib/api/events';
import { Task } from '@/lib/api/tasks';
import { setTokenGetter } from '@/lib/api/client';
import { CalendarService } from './services';
import { CalendarHeader, WeekView, MonthView, DayView, MiniCalendar, AIAgentModal } from './components';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import EditEventModal from '@/components/calendar/EditEventModal';
import CreateActionModal from '@/components/calendar/CreateActionModal';
import CreateTaskModal from '@/components/calendar/CreateTaskModal';
import EditTaskModal from '@/components/calendar/EditTaskModal';
import { CreateTaskRequest } from '@/lib/api/tasks';
import { useSidebar } from './layout';

export default function CalendarViewerPage() {
  const params = useParams();
  const calendarId = params?.id as string;
  const { getToken, user } = useAuth();
  const { toggleSidebar } = useSidebar();

  // Initialize service
  const calendarService = new CalendarService(calendarId);

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Refs for click outside detection
  const datePickerRef = useRef<HTMLDivElement>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  // Set token getter for API client
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDatePicker && datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (showViewDropdown && viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setShowViewDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showViewDropdown, showDatePicker]);

  // Fetch events and tasks
  useEffect(() => {
    if (calendarId) {
      fetchEventsAndTasks();
    }
  }, [calendarId]);

  const fetchEventsAndTasks = async () => {
    try {
      setLoading(true);
      const [eventsData, tasksData] = await Promise.all([
        calendarService.fetchEvents(),
        calendarService.fetchTasks()
      ]);
      setEvents(eventsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching events and tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (eventData: CreateEventRequest) => {
    try {
      console.log('handleCreateEvent called with:', eventData);
      // Add user's timezone to event data
      const eventWithTimezone = {
        ...eventData,
        timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      await calendarService.createEvent(eventWithTimezone);
      console.log('Event created, refreshing list...');
      await fetchEventsAndTasks();
      console.log('Events refreshed');
    } catch (error) {
      console.error('Error in handleCreateEvent:', error);
      alert('Failed to create event: ' + error);
    }
  };

  const handleCreateTask = async (taskData: CreateTaskRequest) => {
    try {
      console.log('handleCreateTask called with:', taskData);
      // Add user's timezone to task data
      const taskWithTimezone = {
        ...taskData,
        timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      await calendarService.createTask(taskWithTimezone);
      console.log('Task created, refreshing list...');
      await fetchEventsAndTasks();
      console.log('Tasks refreshed');
    } catch (error) {
      console.error('Error in handleCreateTask:', error);
      alert('Failed to create task: ' + error);
    }
  };

  const handleEditEvent = (event: CalendarEvent, clickEvent?: React.MouseEvent) => {
    if (clickEvent) {
      setModalPosition({ x: clickEvent.clientX, y: clickEvent.clientY });
    }
    setSelectedEvent(event);
    setHighlightedDate(new Date(event.startTime));
    setShowEditModal(true);
  };

  const handleUpdateEvent = async (eventId: string, updates: UpdateEventRequest) => {
    // Optimistic update: update local state immediately
    setEvents(prev => prev.map(e =>
      e.eventId === eventId ? { ...e, ...updates } : e
    ));

    try {
      await calendarService.updateEvent(eventId, updates);
      // Don't refetch - state is already updated!
    } catch (error) {
      // On error, refetch to get correct state
      await fetchEventsAndTasks();
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await calendarService.deleteEvent(eventId);
      await fetchEventsAndTasks();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const handleEditTask = (task: Task, clickEvent?: React.MouseEvent) => {
    if (clickEvent) {
      setModalPosition({ x: clickEvent.clientX, y: clickEvent.clientY });
    }
    setSelectedTask(task);
    if (task.dueDate) {
      setHighlightedDate(new Date(task.dueDate));
    }
    setShowEditTaskModal(true);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update: update local state immediately
    setTasks(prev => prev.map(t =>
      t.taskId === taskId ? { ...t, ...updates } : t
    ));

    try {
      // Filter out null values for the API request
      const apiUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== null)
      );
      await calendarService.updateTask(taskId, apiUpdates);
      // Don't refetch - state is already updated!
    } catch (error) {
      // On error, refetch to get correct state
      await fetchEventsAndTasks();
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await calendarService.deleteTask(taskId);
      await fetchEventsAndTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  // Handle resizing events by dragging
  const handleEventResize = async (event: CalendarEvent, newEndTime: string) => {
    try {
      await handleUpdateEvent(event.eventId, {
        endTime: newEndTime
      });
    } catch (error) {
      console.error('Error resizing event:', error);
      alert('Failed to resize event');
    }
  };

  // Handle resizing tasks by dragging
  const handleTaskResize = async (task: Task, newDueTime: string, estimatedDuration: number) => {
    try {
      // Extract date portion for dueDate (set time to 00:00:00)
      const dueTimeDate = new Date(newDueTime);
      const dueDateISO = new Date(Date.UTC(
        dueTimeDate.getUTCFullYear(),
        dueTimeDate.getUTCMonth(),
        dueTimeDate.getUTCDate(),
        0, 0, 0, 0
      )).toISOString();

      await handleUpdateTask(task.taskId, {
        dueDate: dueDateISO,
        dueTime: newDueTime,
        estimatedDuration: estimatedDuration
      });
    } catch (error) {
      console.error('Error resizing task:', error);
      alert('Failed to resize task');
    }
  };

  // Handle moving events by dragging
  const handleEventMove = async (event: CalendarEvent, newStartTime: string, newEndTime: string) => {
    try {
      await handleUpdateEvent(event.eventId, {
        startTime: newStartTime,
        endTime: newEndTime
      });
    } catch (error) {
      console.error('Error moving event:', error);
      alert('Failed to move event');
    }
  };

  // Handle moving tasks by dragging
  const handleTaskMove = async (task: Task, newDueTime: string) => {
    try {
      // Extract date portion for dueDate (set time to 00:00:00)
      const dueTimeDate = new Date(newDueTime);
      const dueDateISO = new Date(Date.UTC(
        dueTimeDate.getUTCFullYear(),
        dueTimeDate.getUTCMonth(),
        dueTimeDate.getUTCDate(),
        0, 0, 0, 0
      )).toISOString();

      await handleUpdateTask(task.taskId, {
        dueDate: dueDateISO,
        dueTime: newDueTime,
        estimatedDuration: task.estimatedDuration // Preserve duration when moving
      });
    } catch (error) {
      console.error('Error moving task:', error);
      alert('Failed to move task');
    }
  };

  const handleDayClick = (date: Date, clickEvent: React.MouseEvent) => {
    setModalPosition({ x: clickEvent.clientX, y: clickEvent.clientY });
    setSelectedDate(date);
    setHighlightedDate(date);
    setShowActionModal(true);
  };

  const handleCloseModal = () => {
    setShowActionModal(false);
    setShowCreateEventModal(false);
    setShowCreateTaskModal(false);
    setShowEditModal(false);
    setShowEditTaskModal(false);
    setModalPosition(null);
    setHighlightedDate(null);
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    if (view === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }
  };

  const goToNextMonth = () => {
    if (view === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setPickerYear(new Date().getFullYear());
  };

  // Helper functions
  const getEventsForDay = (day: number, month?: number, year?: number) => {
    const targetMonth = month ?? currentDate.getUTCMonth();
    const targetYear = year ?? currentDate.getUTCFullYear();

    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      // Use UTC methods since we stored dates/times as UTC
      return (
        eventDate.getUTCDate() === day &&
        eventDate.getUTCMonth() === targetMonth &&
        eventDate.getUTCFullYear() === targetYear
      );
    });
  };

  const getWeekStart = (date: Date): Date => {
    const day = date.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    // Create a new date and subtract days to get to Sunday (using UTC to match event storage)
    const weekStart = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - day,
      0, 0, 0, 0
    ));
    return weekStart;
  };

  const getWeekEnd = (date: Date): Date => {
    const day = date.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    // Create a new date and add days to get to Saturday (using UTC to match event storage)
    const weekEnd = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + (6 - day),
      23, 59, 59, 999
    ));
    return weekEnd;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      // Use UTC methods since we stored dates/times as UTC
      return (
        eventDate.getUTCDate() === date.getUTCDate() &&
        eventDate.getUTCMonth() === date.getUTCMonth() &&
        eventDate.getUTCFullYear() === date.getUTCFullYear()
      );
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 bg-gray-50 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-cyan-50/15 to-blue-50/10"></div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-96 -right-96 w-[1000px] h-[1000px] bg-gradient-to-br from-blue-200/35 to-cyan-300/25 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-96 -left-96 w-[900px] h-[900px] bg-gradient-to-tr from-cyan-200/30 to-blue-300/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-100/15 to-blue-100/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col flex-1 min-h-0">
        <div className="w-full px-3 py-2 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex-shrink-0">
            <CalendarHeader
              view={view}
              currentDate={currentDate}
              showDatePicker={showDatePicker}
              pickerYear={pickerYear}
              showViewDropdown={showViewDropdown}
              datePickerRef={datePickerRef}
              viewDropdownRef={viewDropdownRef}
              onViewChange={setView}
              onPreviousClick={goToPreviousMonth}
              onNextClick={goToNextMonth}
              onTodayClick={goToToday}
              onDatePickerToggle={() => {
                setShowDatePicker(!showDatePicker);
                setPickerYear(currentDate.getFullYear());
              }}
              onViewDropdownToggle={() => setShowViewDropdown(!showViewDropdown)}
              onYearChange={setPickerYear}
              onMonthSelect={(month) => {
                const newDate = new Date(pickerYear, month, 1);
                setCurrentDate(newDate);
                setShowDatePicker(false);
              }}
              onCreateClick={() => {
                setSelectedDate(undefined);
                setShowActionModal(true);
              }}
              onMenuClick={toggleSidebar}
              getWeekStart={getWeekStart}
              getWeekEnd={getWeekEnd}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex gap-3 flex-1 min-h-0 mt-3">
            {/* Calendar View */}
            <div className="flex-1 min-w-0 overflow-auto">
              {loading ? (
                <div className="backdrop-blur-xl bg-white/50 border border-white/50 rounded-2xl p-6 shadow-xl">
                  <div className="text-center py-12">
                    <p className="text-gray-500 font-light">Loading events and tasks...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Task Summary */}
                  {tasks.length > 0 && (
                    <div className="backdrop-blur-xl bg-gradient-to-r from-blue-50/80 to-cyan-50/80 border border-blue-200/50 rounded-xl p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-medium text-gray-700">
                            {tasks.filter(t => t.status !== 'completed').length} Active Tasks
                          </span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                            {tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length} Overdue
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                            {tasks.filter(t => t.status === 'completed').length} Completed
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Calendar Views */}
                  {view === 'week' ? (
                    <WeekView
                      currentDate={currentDate}
                      events={events}
                      tasks={tasks}
                      highlightedDate={highlightedDate}
                      onDayClick={handleDayClick}
                      onEventClick={handleEditEvent}
                      onTaskClick={handleEditTask}
                      onEventResize={handleEventResize}
                      onTaskResize={handleTaskResize}
                      onEventMove={handleEventMove}
                      onTaskMove={handleTaskMove}
                      getWeekStart={getWeekStart}
                      getEventsForDate={getEventsForDate}
                    />
                  ) : view === 'day' ? (
                    <DayView
                      currentDate={currentDate}
                      events={events}
                      tasks={tasks}
                      onEventClick={handleEditEvent}
                      onTaskClick={handleEditTask}
                      getEventsForDate={getEventsForDate}
                    />
                  ) : (
                    <MonthView
                      currentDate={currentDate}
                      events={events}
                      tasks={tasks}
                      highlightedDate={highlightedDate}
                      onDayClick={handleDayClick}
                      onEventClick={handleEditEvent}
                      onTaskClick={handleEditTask}
                      getEventsForDay={getEventsForDay}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Mini Calendar Sidebar */}
            <div className="flex-shrink-0 self-start">
              <MiniCalendar
                currentDate={currentDate}
                onDateSelect={(date) => {
                  setCurrentDate(date);
                  setView('week');
                }}
                onTodayClick={goToToday}
              />
            </div>
          </div>
        </div>

        {/* Modals */}
        <CreateActionModal
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setModalPosition(null);
            setHighlightedDate(null);
          }}
          onSelectEvent={() => {
            setShowActionModal(false);
            setShowCreateEventModal(true);
          }}
          onSelectTask={() => {
            setShowActionModal(false);
            setShowCreateTaskModal(true);
          }}
          clickPosition={modalPosition}
        />

        <CreateEventModal
          isOpen={showCreateEventModal}
          onClose={() => {
            setShowCreateEventModal(false);
            setModalPosition(null);
            setHighlightedDate(null);
            setSelectedDate(undefined);
          }}
          onSubmit={async (eventData) => {
            await handleCreateEvent(eventData);
            setShowCreateEventModal(false);
            setModalPosition(null);
            setHighlightedDate(null);
            setSelectedDate(undefined);
          }}
          selectedDate={selectedDate}
          clickPosition={modalPosition}
        />

        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false);
            setModalPosition(null);
            setHighlightedDate(null);
            setSelectedDate(undefined);
          }}
          onSubmit={async (taskData) => {
            await handleCreateTask(taskData);
            setShowCreateTaskModal(false);
            setModalPosition(null);
            setHighlightedDate(null);
            setSelectedDate(undefined);
          }}
          selectedDate={selectedDate}
          clickPosition={modalPosition}
        />

        <EditEventModal
          isOpen={showEditModal}
          onClose={handleCloseModal}
          onSubmit={handleUpdateEvent}
          onDelete={handleDeleteEvent}
          event={selectedEvent}
          clickPosition={modalPosition}
        />

        <EditTaskModal
          isOpen={showEditTaskModal}
          onClose={handleCloseModal}
          onSubmit={handleUpdateTask}
          onDelete={handleDeleteTask}
          task={selectedTask}
        />

        {/* AI Agent Modal */}
        <AIAgentModal calendarId={calendarId} />
      </div>
    </div>
  );
}
