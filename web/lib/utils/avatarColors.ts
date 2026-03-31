/**
 * Centralized avatar color management
 * Provides consistent, high-contrast colors for contact avatars
 * Excludes white, indigo, and other light colors that are hard to see
 */

const AVATAR_COLORS = [
  'bg-slate-700',    // Dark gray - excellent contrast
  'bg-purple-700',   // Darker purple - great visibility
  'bg-emerald-700',  // Darker emerald - high contrast
  'bg-rose-600',     // Rose instead of pink - better visibility
  'bg-teal-700',     // Darker teal - strong contrast
  'bg-red-600',      // Red - excellent visibility
  'bg-amber-700',    // Darker amber - good contrast
  'bg-violet-700',   // Darker violet - high contrast
  'bg-blue-600',     // Blue - great visibility
  'bg-green-600',    // Green - excellent contrast
  'bg-orange-600',   // Orange - good visibility
  'bg-cyan-700'      // Dark cyan - strong contrast
];

/**
 * Generate a consistent avatar color based on a contact ID
 * Uses a simple hash function to ensure the same ID always gets the same color
 * 
 * @param contactId - The unique identifier for the contact
 * @returns A Tailwind CSS background color class
 */
export function getAvatarColor(contactId: string): string {
  // Simple hash function to convert string to number
  const hash = contactId.split('').reduce((acc, char) => {
    acc = ((acc << 5) - acc) + char.charCodeAt(0);
    return acc & acc; // Convert to 32-bit integer
  }, 0);
  
  // Use absolute value and modulo to get consistent index
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
  
  return AVATAR_COLORS[colorIndex];
}

/**
 * Get all available avatar colors
 * Useful for testing or displaying color options
 * 
 * @returns Array of all avatar color classes
 */
export function getAllAvatarColors(): string[] {
  return [...AVATAR_COLORS];
}

/**
 * Check if a color is a valid avatar color
 * 
 * @param color - The color class to check
 * @returns True if the color is in the avatar colors list
 */
export function isValidAvatarColor(color: string): boolean {
  return AVATAR_COLORS.includes(color);
}