/**
 * Panel Registry
 *
 * Central registry of all available panel types.
 * Add new panel types here to make them available in the workspace.
 */

import { PanelType, PanelTypeInfo } from '@/types/workspace/panel.types';

/**
 * Registry of all available panel types
 * This powers the "Add Panel" modal
 */
export const PANEL_REGISTRY: Record<PanelType, PanelTypeInfo> = {
  agents: {
    type: 'agents',
    label: 'Agents',
    description: 'View and manage your AI team',
    icon: 'AG',
    defaultSize: { w: 3, h: 6 }
  },

  chat: {
    type: 'chat',
    label: 'Chat',
    description: 'Conversation with an AI agent',
    icon: 'CH',
    defaultSize: { w: 6, h: 8 }
  },

  tools: {
    type: 'tools',
    label: 'Tools',
    description: 'Available agent tools and capabilities',
    icon: 'TL',
    defaultSize: { w: 4, h: 6 }
  },

  tasks: {
    type: 'tasks',
    label: 'Tasks',
    description: 'Track tasks and todos',
    icon: 'TS',
    defaultSize: { w: 4, h: 5 }
  },

  workflows: {
    type: 'workflows',
    label: 'Workflows',
    description: 'Build and run workflows',
    icon: 'WF',
    defaultSize: { w: 8, h: 6 }
  },

  notes: {
    type: 'notes',
    label: 'Notes',
    description: 'Quick notes and scratchpad',
    icon: 'NT',
    defaultSize: { w: 4, h: 4 }
  }
};

/**
 * Get all available panel types as an array
 */
export function getAllPanelTypes(): PanelTypeInfo[] {
  return Object.values(PANEL_REGISTRY);
}

/**
 * Get metadata for a specific panel type
 */
export function getPanelTypeInfo(type: PanelType): PanelTypeInfo {
  return PANEL_REGISTRY[type];
}

/**
 * Generate a unique panel ID
 */
export function generatePanelId(type: PanelType): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${type}-${timestamp}-${random}`;
}
