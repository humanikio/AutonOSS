/**
 * Panel Components Index
 *
 * Central export point for all panel components.
 * Import panels from here to keep imports clean.
 */

export { default as AgentsPanel } from './AgentsPanel';
export { default as ChatPanel } from './ChatPanel';
export { default as ToolsPanel } from './ToolsPanel';
export { default as TasksPanel } from './TasksPanel';
export { default as WorkflowsPanel } from './WorkflowsPanel';
export { default as NotesPanel } from './NotesPanel';
export { default as PanelContainer } from './PanelContainer';

// Re-export panel registry utilities
export { PANEL_REGISTRY, getAllPanelTypes, getPanelTypeInfo, generatePanelId } from './panelRegistry';
