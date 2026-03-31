/**
 * Real World State Context
 * Provides current date, time, and timezone information for LLM prompts
 */

import { firestore } from '../../../../../config/firebase';

/**
 * Get current real-world state context
 * Provides user's timezone-aware date and time information
 *
 * @param tenantId - Tenant ID to fetch user timezone
 * @param userTimezone - Optional user timezone (IANA format). If not provided, defaults to UTC
 * @returns String with current date/time context for LLM
 */
export function getRealWorldStateContext(tenantId?: string, userTimezone?: string): string {
  const now = new Date();
  const timezone = userTimezone || 'UTC';

  // Get timezone offset in format like "+05:00" or "-05:00"
  const getTimezoneOffset = (tz: string): string => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'longOffset'
      });
      const parts = formatter.formatToParts(now);
      const offset = parts.find(p => p.type === 'timeZoneName')?.value || 'UTC';
      // Extract offset like "GMT-5" or "UTC+5:30"
      const match = offset.match(/([+-]\d{1,2}):?(\d{2})?/);
      if (match) {
        const hours = match[1];
        const minutes = match[2] || '00';
        return `${hours.padStart(3, '0')}:${minutes}`;
      }
      return '+00:00';
    } catch {
      return '+00:00';
    }
  };

  const tzOffset = getTimezoneOffset(timezone);

  // Format date/time in user's timezone
  const localFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = localFormatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';

  const localDate = `${get('year')}-${get('month')}-${get('day')}`;
  const localTime = `${get('hour')}:${get('minute')}:${get('second')}`;

  // UTC values
  const utcDate = now.toISOString().split('T')[0];
  const utcTime = now.toISOString().split('T')[1].split('.')[0];
  const utcDateTime = now.toISOString();

  // Human-readable in user timezone
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone });
  const monthName = now.toLocaleDateString('en-US', { month: 'long', timeZone: timezone });
  const dayOfMonth = parseInt(get('day'));
  const year = parseInt(get('year'));

  // Calculate tomorrow and yesterday in user's timezone
  const tomorrowLocal = new Date(now);
  tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);
  const tomorrowParts = localFormatter.formatToParts(tomorrowLocal);
  const getTomorrow = (type: string) => tomorrowParts.find(p => p.type === type)?.value || '';
  const tomorrow = `${getTomorrow('year')}-${getTomorrow('month')}-${getTomorrow('day')}`;

  const yesterdayLocal = new Date(now);
  yesterdayLocal.setDate(yesterdayLocal.getDate() - 1);
  const yesterdayParts = localFormatter.formatToParts(yesterdayLocal);
  const getYesterday = (type: string) => yesterdayParts.find(p => p.type === type)?.value || '';
  const yesterday = `${getYesterday('year')}-${getYesterday('month')}-${getYesterday('day')}`;

  const context = `
====================
CURRENT DATE & TIME
====================

User's Local Time (${timezone} UTC${tzOffset}):
- Current DateTime: ${localDate}T${localTime}${tzOffset}
- Current Date: ${localDate}
- Current Time: ${localTime}
- Day of Week: ${dayOfWeek}
- Full Date: ${monthName} ${dayOfMonth}, ${year}

UTC Time (for database storage):
- Current DateTime (ISO 8601): ${utcDateTime}
- Current Date: ${utcDate}
- Current Time: ${utcTime}Z

Quick References (User's Local Time):
- Today: ${localDate} (${dayOfWeek})
- Tomorrow: ${tomorrow}
- Yesterday: ${yesterday}

====================
CRITICAL: TIME HANDLING
====================

When user mentions a time (e.g., "2pm", "tomorrow at 3pm"):
1. User is speaking in ${timezone} time (UTC${tzOffset})
2. Convert their local time to UTC for storage
3. Example: User says "today at 2pm"
   - User means: ${localDate}T14:00:00${tzOffset}
   - Convert to UTC by adjusting for ${tzOffset}
   - Store as UTC ISO string with Z suffix

When displaying times to user:
1. Convert FROM UTC TO ${timezone}
2. Show times in user's local timezone (UTC${tzOffset})

STORAGE FORMAT:
- Always store in database as UTC ISO 8601: YYYY-MM-DDTHH:MM:SSZ
- The 'Z' suffix means UTC timezone
- Example: "${utcDateTime}"

DATE CONVERSIONS (in user's local time):
- "today" -> ${localDate}
- "tomorrow" -> ${tomorrow}
- "yesterday" -> ${yesterday}
- "this ${dayOfWeek}" -> ${localDate}
- "next ${dayOfWeek}" -> (calculate +7 days from ${localDate})
  `.trim();

  return context;
}

/**
 * Get just the current ISO date (for quick access)
 * @returns Current date in ISO format (YYYY-MM-DD)
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get just the current ISO datetime (for quick access)
 * @returns Current datetime in ISO format (YYYY-MM-DDTHH:MM:SSZ)
 */
export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

/**
 * Convert relative time to ISO datetime
 * Helper for common conversions
 *
 * @param relativeTime - String like "today at 2pm", "tomorrow at 3pm"
 * @returns ISO datetime string
 */
export function parseRelativeTime(relativeTime: string): string | null {
  const now = new Date();

  // Match patterns like "today at 2pm", "tomorrow at 3:30pm"
  const match = relativeTime.match(/(today|tomorrow)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  if (!match) {
    return null;
  }

  const [, day, hours, minutes = '00', meridiem] = match;

  // Calculate date
  let date = new Date(now);
  if (day.toLowerCase() === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  }

  // Convert to 24-hour format
  let hour = parseInt(hours);
  if (meridiem?.toLowerCase() === 'pm' && hour !== 12) {
    hour += 12;
  } else if (meridiem?.toLowerCase() === 'am' && hour === 12) {
    hour = 0;
  }

  // Format as ISO
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = `${hour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;

  return `${dateStr}T${timeStr}Z`;
}
