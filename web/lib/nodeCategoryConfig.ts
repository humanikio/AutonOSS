/**
 * Node Category Configuration
 * Defines how nodes are grouped in the Action/Trigger selection panel
 */

import {
  Users,
  GitBranch,
  Settings,
  Plug,
  Wrench,
  Zap,
  Target,
  MessageSquare,
  Bot,
  LucideIcon
} from 'lucide-react';

export interface NodeCategory {
  id: string;
  displayName: string;
  description: string;
  icon: LucideIcon;
  color: string;
  priority: number;
}

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: 'trigger',
    displayName: 'Triggers',
    description: 'Start your workflow',
    icon: Zap,
    color: '#EAB308', // Yellow
    priority: 1,
  },
  {
    id: 'contactManagement',
    displayName: 'Contact Management',
    description: 'Manage customer contacts and relationships',
    icon: Users,
    color: '#3B82F6', // Blue
    priority: 2,
  },
  {
    id: 'opportunities',
    displayName: 'Opportunities',
    description: 'Manage sales opportunities and pipelines',
    icon: Target,
    color: '#10B981', // Green
    priority: 3,
  },
  {
    id: 'communication',
    displayName: 'Communication',
    description: 'Send SMS and email messages',
    icon: MessageSquare,
    color: '#10B981', // Green
    priority: 4,
  },
  {
    id: 'agentCommunication',
    displayName: 'Agent Communication',
    description: 'AI agent-driven SMS and phone interactions',
    icon: Bot,
    color: '#8B5CF6', // Purple
    priority: 5,
  },
  {
    id: 'flowControl',
    displayName: 'Flow Control',
    description: 'Control workflow execution paths and logic',
    icon: GitBranch,
    color: '#9333EA', // Purple
    priority: 6,
  },
  {
    id: 'dataTransform',
    displayName: 'Data Transform',
    description: 'Modify and transform data',
    icon: Settings,
    color: '#8B5CF6', // Purple/Violet
    priority: 7,
  },
  {
    id: 'integrations',
    displayName: 'Integrations',
    description: 'Connect to external services and APIs',
    icon: Plug,
    color: '#F59E0B', // Orange
    priority: 8,
  },
  {
    id: 'helpers',
    displayName: 'Helpers',
    description: 'Utility functions and workflow helpers',
    icon: Wrench,
    color: '#6B7280', // Gray
    priority: 9,
  },
];

/**
 * Maps old n8n group values to new category IDs
 */
export const GROUP_TO_CATEGORY_MAP: Record<string, string> = {
  // Triggers
  trigger: 'trigger',

  // Contact Management
  contactManagement: 'contactManagement',
  pulseline: 'contactManagement',

  // Opportunities
  opportunities: 'opportunities',

  // Communication
  communication: 'communication',
  sms: 'communication',
  email: 'communication',

  // Agent Communication
  'agent-communication': 'agentCommunication',
  agentCommunication: 'agentCommunication',
  phone: 'agentCommunication',

  // Flow Control
  flowControl: 'flowControl',
  condition: 'flowControl',

  // Data Transform
  transform: 'dataTransform',
  input: 'dataTransform',
  dataTransform: 'dataTransform',

  // Integrations
  output: 'integrations',
  integrations: 'integrations',

  // Helpers
  organization: 'helpers',
  helper: 'helpers',
  helpers: 'helpers',
};

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: string): NodeCategory | undefined {
  return NODE_CATEGORIES.find(cat => cat.id === categoryId);
}

/**
 * Get category from node group array
 */
export function getCategoryFromGroup(groups: string[]): NodeCategory {
  const groupValue = groups[0] || 'dataTransform';
  const categoryId = GROUP_TO_CATEGORY_MAP[groupValue] || 'dataTransform';
  return getCategoryById(categoryId) || NODE_CATEGORIES.find(c => c.id === 'dataTransform')!;
}
