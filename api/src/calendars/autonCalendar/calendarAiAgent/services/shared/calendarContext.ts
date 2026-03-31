/**
 * Shared Calendar Context Service
 * Used by both Brain and TaskService to fetch calendar data
 *
 * This service allows the brain to request specific calendar context
 * (tasks and events) with precise date ranges and filters.
 */

import { getTasks } from '../../../services/taskManager/getTasks';
import { getEvents } from '../../../services/eventManager/getEvents';
import { readCalendar } from '../../../services/calendarManager/readCalendar';
import type { Task } from '../../../services/taskManager/createTask';
import type { CalendarEvent } from '../../../services/eventManager/createEvent';
import type { Calendar } from '../../../services/calendarManager/createCalendar';

export interface CalendarContextRequest {
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeTasks?: boolean;      // Default: true
  includeEvents?: boolean;     // Default: true
  taskFilters?: {
    status?: 'pending' | 'completed' | 'all';
    priority?: 'low' | 'medium' | 'high';
  };
  limit?: number;               // Max items to return (prevent token overflow)
}

export interface CalendarContextResponse {
  calendar: Calendar;
  tasks: Task[];
  events: CalendarEvent[];
  summary: {
    totalTasks: number;
    totalEvents: number;
    dateRange: { start: Date; end: Date } | null;
  };
}

/**
 * Fetch calendar context based on specific requirements
 * Used by both Brain and TaskService
 *
 * @param tenantId - Tenant ID
 * @param calendarId - Calendar ID
 * @param request - Context request with filters and date range
 * @returns Calendar context with tasks and events
 */
export async function fetchCalendarContext(
  tenantId: string,
  calendarId: string,
  request: CalendarContextRequest
): Promise<CalendarContextResponse> {
  console.log(`=� Fetching calendar context for ${calendarId}`, {
    dateRange: request.dateRange ? {
      start: request.dateRange.start.toISOString(),
      end: request.dateRange.end.toISOString()
    } : 'all',
    includeTasks: request.includeTasks,
    includeEvents: request.includeEvents
  });

  const {
    dateRange,
    includeTasks = true,
    includeEvents = true,
    taskFilters,
    limit = 50  // Default limit to prevent token overflow
  } = request;

  // Fetch calendar metadata
  const calendar = await readCalendar(tenantId, calendarId);
  if (!calendar) {
    throw new Error(`Calendar not found: ${calendarId}`);
  }

  // Fetch tasks if requested
  let tasks: Task[] = [];
  if (includeTasks) {
    const allTasks = await getTasks(tenantId, calendarId);

    console.log(`\n   📊 Task Date Filtering Debug:`);
    console.log(`   Date range: ${dateRange?.start.toISOString()} to ${dateRange?.end.toISOString()}`);
    console.log(`   Total tasks to filter: ${allTasks.length}`);

    // Apply filters
    tasks = allTasks.filter(task => {
      // Filter by date range
      if (dateRange) {
        // If filtering by date range, ONLY include tasks with dates in that range
        if (!task.dueDate) {
          console.log(`   ❌ Excluding "${task.taskName}" - no due date`);
          return false; // Exclude tasks without due dates when filtering by date
        }
        const taskDate = new Date(task.dueDate);
        const inRange = taskDate >= dateRange.start && taskDate <= dateRange.end;

        console.log(`   ${inRange ? '✓' : '❌'} Task "${task.taskName}": dueDate=${taskDate.toISOString()}, inRange=${inRange}`);

        if (!inRange) {
          return false;
        }
      }

      // Filter by status
      if (taskFilters?.status && taskFilters.status !== 'all') {
        if (taskFilters.status === 'completed' && task.status !== 'completed') {
          return false;
        }
        if (taskFilters.status === 'pending' && task.status === 'completed') {
          return false;
        }
      }

      // Filter by priority
      if (taskFilters?.priority && task.priority !== taskFilters.priority) {
        return false;
      }

      return true;
    });

    // Sort by due date
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    // Limit to prevent token overflow
    if (tasks.length > limit) {
      console.warn(`�  Limiting tasks from ${tasks.length} to ${limit}`);
      tasks = tasks.slice(0, limit);
    }
  }

  // Fetch events if requested
  let events: CalendarEvent[] = [];
  if (includeEvents) {
    const allEvents = await getEvents(tenantId, calendarId);
    console.log(`   Total events in calendar: ${allEvents.length}`);

    // Apply date range filter
    if (dateRange) {
      console.log(`   Filtering events for date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);
      events = allEvents.filter(event => {
        const eventStart = new Date(event.startTime);
        const inRange = eventStart >= dateRange.start && eventStart <= dateRange.end;
        if (!inRange) {
          console.log(`   Excluding event "${event.eventName}" (${eventStart.toISOString()}) - outside range`);
        }
        return inRange;
      });
      console.log(`   Events after date filter: ${events.length}`);
    } else {
      events = allEvents;
    }

    // Sort by start time (already done by getEvents, but ensure)
    events.sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    // Limit to prevent token overflow
    if (events.length > limit) {
      console.warn(`�  Limiting events from ${events.length} to ${limit}`);
      events = events.slice(0, limit);
    }
  }

  console.log(` Fetched ${tasks.length} tasks, ${events.length} events`);

  return {
    calendar,
    tasks,
    events,
    summary: {
      totalTasks: tasks.length,
      totalEvents: events.length,
      dateRange: dateRange || null
    }
  };
}

/**
 * Format calendar context for LLM consumption
 * Converts structured data into natural language prompt section
 *
 * @param context - Calendar context response
 * @returns Formatted string for LLM prompt injection
 */
export function formatCalendarContextForLLM(context: CalendarContextResponse): string {
  const { calendar, tasks, events, summary } = context;

  console.log(`\n📝 Formatting calendar context for LLM:`);
  console.log(`   - Tasks to format: ${tasks.length}`);
  console.log(`   - Events to format: ${events.length}`);

  let output = `\n====================\nCALENDAR CONTEXT\n====================\n\n`;
  output += `Calendar: ${calendar.name}\n`;

  if (summary.dateRange) {
    const start = summary.dateRange.start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const end = summary.dateRange.end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    output += `Date Range: ${start} - ${end}\n`;
  }

  output += `Tasks Found: ${summary.totalTasks}\n`;
  output += `Events Found: ${summary.totalEvents}\n\n`;

  // Tasks section
  if (tasks.length > 0) {
    output += `TASKS:\n`;
    tasks.forEach(task => {
      // Format dueDate in UTC to match the stored date (avoid timezone conversion issues)
      let due = 'No due date';
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const month = dueDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        const day = dueDate.getUTCDate();
        due = `${month} ${day}`;
      }

      const time = task.dueTime
        ? ` at ${new Date(task.dueTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })}`
        : '';

      const priority = task.priority ? ` [${task.priority}]` : '';
      const status = task.status === 'completed' ? ' ' : '';

      output += `  - ${task.taskName}${priority} - Due: ${due}${time}${status}\n`;

      if (task.description) {
        // Truncate long descriptions
        const desc = task.description.length > 100
          ? task.description.substring(0, 100) + '...'
          : task.description;
        output += `    Description: ${desc}\n`;
      }

      // Include taskId for reference (brain needs this to update/delete)
      output += `    TaskID: ${task.taskId}\n`;
    });
    output += `\n`;
  }

  // Events section
  if (events.length > 0) {
    output += `EVENTS:\n`;
    events.forEach(event => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);

      const date = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      const timeRange = `${start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })} - ${end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })}`;

      output += `  - ${event.eventName} - ${date} ${timeRange}\n`;

      if (event.description) {
        const desc = event.description.length > 100
          ? event.description.substring(0, 100) + '...'
          : event.description;
        output += `    Description: ${desc}\n`;
      }

      if (event.location) {
        output += `    Location: ${event.location}\n`;
      }

      // Include eventId for reference
      output += `    EventID: ${event.eventId}\n`;
    });
    output += `\n`;
  }

  output += `Use this context for:\n`;
  output += `- Finding tasks/events by semantic description (use the IDs provided)\n`;
  output += `- Detecting scheduling conflicts\n`;
  output += `- Making intelligent suggestions\n`;
  output += `- Understanding current workload\n`;

  console.log(`✓ Formatted context includes TASKS section: ${output.includes('TASKS:')}`);
  console.log(`✓ Formatted context includes EVENTS section: ${output.includes('EVENTS:')}`);

  return output;
}
