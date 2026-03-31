/**
 * Validates and sanitizes tool names for 11Labs API
 * 11Labs requires: ^[a-zA-Z0-9_-]{1,64}$
 */

export interface ToolNameValidation {
  isValid: boolean;
  sanitized: string;
  error?: string;
}

const ELEVENLABS_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validates if a name matches 11Labs requirements
 */
export function validate11LabsToolName(name: string): ToolNameValidation {
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      sanitized: '',
      error: 'Tool name is required',
    };
  }

  const trimmed = name.trim();

  // Check if already valid
  if (ELEVENLABS_NAME_PATTERN.test(trimmed)) {
    return {
      isValid: true,
      sanitized: trimmed,
    };
  }

  // Auto-sanitize: replace spaces with underscores
  const sanitized = trimmed
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_-]/g, '') // Remove invalid characters
    .substring(0, 64);              // Limit to 64 characters

  // Check if sanitized version is valid
  if (sanitized === '') {
    return {
      isValid: false,
      sanitized: '',
      error: 'Tool name must contain at least one alphanumeric character',
    };
  }

  if (ELEVENLABS_NAME_PATTERN.test(sanitized)) {
    return {
      isValid: true,
      sanitized,
      error: `Tool name contained invalid characters. Sanitized to: "${sanitized}". Use only letters, numbers, hyphens, and underscores.`,
    };
  }

  return {
    isValid: false,
    sanitized,
    error: 'Tool name must contain only letters, numbers, hyphens, and underscores (max 64 characters)',
  };
}
