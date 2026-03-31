/**
 * Panel System Types
 *
 * This file defines the core types for the workspace panel system.
 * All panels must conform to these interfaces.
 */

import { Layout } from 'react-grid-layout';

/**
 * Available panel types in the workspace
 * Add new panel types here as you create them
 */
export type PanelType =
  | 'agents'      // List of AI agents
  | 'chat'        // Chat interface with an agent
  | 'tools'       // Available tools for agents
  | 'tasks'       // Task/todo list
  | 'workflows'   // Workflow builder/viewer
  | 'notes';      // Quick notes panel

/**
 * Base configuration that all panels share
 */
export interface BasePanelConfig {
  title?: string;  // Optional custom title for the panel
}

/**
 * Panel-specific configurations
 * Each panel type can have its own config structure
 */
export interface AgentPanelConfig extends BasePanelConfig {
  // No additional config needed for agents list
}

export interface ChatPanelConfig extends BasePanelConfig {
  agentId?: string;  // Which agent this chat is connected to
}

export interface ToolsPanelConfig extends BasePanelConfig {
  agentId?: string;  // Show tools for a specific agent
}

export interface TasksPanelConfig extends BasePanelConfig {
  // Future: filter, sort options
}

export interface WorkflowsPanelConfig extends BasePanelConfig {
  workflowId?: string;  // Specific workflow to display
}

export interface NotesPanelConfig extends BasePanelConfig {
  // Future: note content, formatting options
}

/**
 * Union type of all possible panel configs
 */
export type PanelConfig =
  | AgentPanelConfig
  | ChatPanelConfig
  | ToolsPanelConfig
  | TasksPanelConfig
  | WorkflowsPanelConfig
  | NotesPanelConfig;

/**
 * Complete panel data structure
 * This is what gets saved to the workspace
 */
export interface PanelData {
  id: string;              // Unique identifier (e.g., 'agents-1', 'chat-2')
  type: PanelType;         // What kind of panel this is
  config: PanelConfig;     // Panel-specific configuration
}

/**
 * Complete workspace layout structure
 * This gets saved to workspace metadata in Firestore
 */
export interface WorkspaceLayout {
  grid: Layout[];                    // react-grid-layout positions/sizes
  panels: Record<string, PanelData>; // Panel data indexed by panel ID
}

/**
 * Props that every panel component receives
 */
export interface BasePanelProps {
  panelId: string;
  config: PanelConfig;
  onConfigChange?: (newConfig: PanelConfig) => void;
  onClose?: () => void;
}

/**
 * Panel type metadata for the "Add Panel" modal
 */
export interface PanelTypeInfo {
  type: PanelType;
  label: string;
  description: string;
  icon: string;  // Icon name or emoji
  defaultSize: { w: number; h: number };  // Default grid size
}
