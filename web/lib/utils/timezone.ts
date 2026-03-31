/**
 * Timezone utilities for auto-detecting and displaying user timezones
 */

/**
 * Get user's IANA timezone (e.g., 'America/New_York')
 * Uses browser's Intl API to detect timezone
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone, defaulting to UTC', error);
    return 'UTC';
  }
}

/**
 * Get friendly timezone display name with offset
 * Example: "America/New_York (EST)" or "America/Los_Angeles (PST)"
 */
export function getTimezoneDisplay(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(p => p.type === 'timeZoneName')?.value;
    return `${timezone} (${timeZoneName})`;
  } catch {
    return timezone;
  }
}

/**
 * Validate if a timezone string is valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Common timezones for quick selection
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (No DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
] as const;
