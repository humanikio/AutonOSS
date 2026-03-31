/**
 * Icon Mapping Utilities
 * Maps backend FontAwesome icon strings to Lucide React components
 */

import {
  MessageCircle,
  MessageSquare,
  Phone,
  Mail,
  Send,
  Search,
  UserPlus,
  UserX,
  Edit,
  Target,
  Trash2,
  Clock,
  Code,
  GitBranch,
  GitMerge,
  Split,
  Pause,
  Settings,
  Zap,
  Wifi,
  Globe,
  Bot,
  MailOpen,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps FontAwesome icon strings (from backend) to Lucide React components
 * Format: 'fa:icon-name' -> LucideIcon
 */
export const FA_TO_LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  // Communication Icons
  'fa:comment-dots': MessageCircle,     // Send SMS (standard)
  'fa:envelope-open-text': MailOpen,    // Send Email
  'fa:envelope': Mail,                  // Send Email (fallback)

  // AI Agent Icons
  'fa:robot': Bot,                      // AI Agent nodes (SMS/Phone)

  // Contact Management Icons
  'fa:search': Search,                  // Find Contact
  'fa:user-plus': UserPlus,             // Create Contact
  'fa:user-edit': Edit,                 // Update Contact
  'fa:user-times': UserX,               // Delete Contact

  // Opportunity Icons
  'fa:bullseye': Target,                // Create Opportunity
  'fa:edit': Edit,                      // Update Opportunity
  'fa:trash': Trash2,                   // Delete Opportunity

  // Trigger Icons
  'fa:clock': Clock,                    // Schedule Trigger
  // Webhook uses custom SVG, will fallback to Wifi

  // Action Icons
  'fa:code': Code,                      // Code node
  'fa:pen': Settings,                   // Set node
  'fa:pause-circle': Pause,             // Wait node
  // HTTP Request uses custom SVG, will fallback to Globe

  // Flow Control Icons
  'fa:code-branch': GitBranch,          // Merge node
  'fa:map-signs': Split,                // Switch/If nodes
};

/**
 * Maps Lucide icon component names (string) to actual components
 * Used when icon name is stored as string in node data
 */
export const LUCIDE_NAME_TO_COMPONENT_MAP: Record<string, LucideIcon> = {
  Zap,
  Wifi,
  UserPlus,
  GitBranch,
  MessageCircle,
  MessageSquare,
  Phone,
  Mail,
  MailOpen,
  Send,
  Search,
  UserX,
  Edit,
  Target,
  Trash2,
  Clock,
  Code,
  GitMerge,
  Split,
  Pause,
  Settings,
  Globe,
  Bot,
};

/**
 * Get Lucide icon component from FontAwesome icon string or Lucide name
 * @param iconString - Icon identifier (e.g., 'fa:comment-dots' or 'Zap')
 * @param defaultIcon - Fallback icon if no match found
 * @returns Lucide icon component
 */
export function getIconComponent(
  iconString: string | undefined,
  defaultIcon: LucideIcon = Zap
): LucideIcon {
  if (!iconString) return defaultIcon;

  // Check if it's a FontAwesome icon string
  if (iconString.startsWith('fa:')) {
    return FA_TO_LUCIDE_ICON_MAP[iconString] || defaultIcon;
  }

  // Check if it's a Lucide component name
  if (LUCIDE_NAME_TO_COMPONENT_MAP[iconString]) {
    return LUCIDE_NAME_TO_COMPONENT_MAP[iconString];
  }

  // Default fallback
  return defaultIcon;
}
