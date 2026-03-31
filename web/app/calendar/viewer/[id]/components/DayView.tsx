'use client';

import { CalendarEvent } from '@/lib/api/events';
import { Task } from '@/lib/api/tasks';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: Task[];
  onEventClick: (event: CalendarEvent, clickEvent: React.MouseEvent) => void;
  onTaskClick?: (task: Task, clickEvent: React.MouseEvent) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
}

export default function DayView({
  currentDate,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  getEventsForDate
}: DayViewProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const isToday =
    currentDate.getDate() === new Date().getDate() &&
    currentDate.getMonth() === new Date().getMonth() &&
    currentDate.getFullYear() === new Date().getFullYear();

  const dayEvents = getEventsForDate(currentDate);

  // Get tasks for this day
  const dayTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    // Use UTC methods since we stored dates as UTC
    return (
      taskDate.getUTCDate() === currentDate.getDate() &&
      taskDate.getUTCMonth() === currentDate.getMonth() &&
      taskDate.getUTCFullYear() === currentDate.getFullYear()
    );
  });

  return (
    <div className="backdrop-blur-xl bg-white/50 border border-white/50 rounded-2xl p-6 shadow-xl">
      <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm text-gray-500 uppercase">{dayNames[currentDate.getDay()]}</div>
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`text-4xl font-light ${
                  isToday
                    ? 'flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-full font-medium'
                    : 'text-gray-900'
                }`}
              >
                {currentDate.getDate()}
              </span>
              <div className="text-2xl font-light text-gray-700">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {dayEvents.length === 0 && dayTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No events or tasks scheduled for this day
            </div>
          ) : (
            <>
              {/* Events */}
              {dayEvents.map((event) => {
                const isCompleted = event.status === 'completed';
                return (
                  <div
                    key={event.eventId}
                    className={`backdrop-blur-lg bg-white/70 border border-white/60 rounded-xl p-4 hover:bg-white/80 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      isCompleted ? 'opacity-50' : ''
                    }`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: event.color || '#3B82F6' }}
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event, e);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        onEventClick(event, e as any);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-base font-medium text-gray-900 mb-1 ${isCompleted ? 'line-through' : ''}`}>
                          {event.eventName}
                        </h4>
                        <div className="text-sm text-gray-600">
                          {new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                        {event.location && (
                          <div className="text-xs text-gray-500 mt-1">{event.location}</div>
                        )}
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: event.color || '#3B82F6' }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Tasks */}
              {dayTasks.map((task) => {
                const isCompleted = task.status === 'completed';
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
                return (
                  <div
                    key={task.taskId}
                    className={`backdrop-blur-lg rounded-xl p-4 hover:bg-white/80 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      isCompleted ? 'opacity-50 bg-gray-100 border border-gray-300' :
                      isOverdue ? 'bg-red-50/70 border border-red-300' :
                      'bg-blue-50/70 border border-blue-300'
                    }`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: isCompleted ? '#9CA3AF' : isOverdue ? '#EF4444' : '#3B82F6' }}
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onTaskClick) {
                        onTaskClick(task, e);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onTaskClick) {
                        e.stopPropagation();
                        onTaskClick(task, e as any);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-base font-medium text-gray-900 mb-1 ${isCompleted ? 'line-through' : ''}`}>
                          📋 {task.taskName}
                        </h4>
                        {task.dueTime && (
                          <div className="text-sm text-gray-600">
                            Due: {new Date(task.dueTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        )}
                        {task.description && (
                          <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
