/**
 * WorkspaceCanvas
 *
 * Main canvas component using react-grid-layout.
 * This is the "desktop" where users drag and arrange panels.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { Plus, Settings } from 'lucide-react';
import { PanelType, PanelData, WorkspaceLayout } from '@/types/workspace/panel.types';
import { generatePanelId } from './panels/panelRegistry';
import {
  AgentsPanel,
  ChatPanel,
  TasksPanel,
  NotesPanel,
  ToolsPanel,
  WorkflowsPanel
} from './panels';

// Import react-grid-layout styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface WorkspaceCanvasProps {
  workspaceId: string;
  initialLayout?: WorkspaceLayout;
  onLayoutChange?: (layout: WorkspaceLayout) => void;
  onAddPanel?: () => void;
  onSettings?: () => void;
}

export default function WorkspaceCanvas({
  workspaceId,
  initialLayout,
  onLayoutChange,
  onAddPanel,
  onSettings
}: WorkspaceCanvasProps) {
  // State for grid layout and panels
  const [gridLayout, setGridLayout] = useState<Layout[]>(initialLayout?.grid || []);
  const [panels, setPanels] = useState<Record<string, PanelData>>(initialLayout?.panels || {});

  // Sync state when initialLayout changes from parent
  useEffect(() => {
    if (initialLayout) {
      setGridLayout(initialLayout.grid);
      setPanels(initialLayout.panels);
    }
  }, [initialLayout]);

  // Grid configuration
  const gridConfig = {
    cols: 12,           // 12 column grid
    rowHeight: 60,      // Each row is 60px tall
    width: 1200,        // Base width (will be responsive)
    margin: [12, 12] as [number, number],   // 12px margins between panels
    containerPadding: [12, 12] as [number, number], // 12px padding around grid
    isDraggable: true,
    isResizable: true,
    compactType: null as 'horizontal' | 'vertical' | null, // Free-form layout
    preventCollision: true // Panels push each other
  };

  // Handle layout changes (drag/resize)
  const handleLayoutChange = (newLayout: Layout[]) => {
    setGridLayout(newLayout);

    // Notify parent of layout change
    if (onLayoutChange) {
      onLayoutChange({
        grid: newLayout,
        panels
      });
    }
  };

  // Handle panel close
  const handlePanelClose = (panelId: string) => {
    // Remove from grid layout
    setGridLayout(prev => prev.filter(item => item.i !== panelId));

    // Remove from panels
    const newPanels = { ...panels };
    delete newPanels[panelId];
    setPanels(newPanels);

    // Notify parent
    if (onLayoutChange) {
      onLayoutChange({
        grid: gridLayout.filter(item => item.i !== panelId),
        panels: newPanels
      });
    }
  };

  // Render the appropriate panel component based on type
  const renderPanel = (panelId: string, panelData: PanelData) => {
    const commonProps = {
      panelId,
      config: panelData.config,
      onClose: () => handlePanelClose(panelId)
    };

    switch (panelData.type) {
      case 'agents':
        return <AgentsPanel {...commonProps} />;
      case 'chat':
        return <ChatPanel {...commonProps} />;
      case 'tasks':
        return <TasksPanel {...commonProps} />;
      case 'notes':
        return <NotesPanel {...commonProps} />;
      case 'tools':
        return <ToolsPanel {...commonProps} />;
      case 'workflows':
        return <WorkflowsPanel {...commonProps} />;
      default:
        return <div>Unknown panel type</div>;
    }
  };

  // Check if workspace is empty
  const isEmpty = gridLayout.length === 0;

  return (
    <div className="h-full bg-gray-50 relative overflow-auto">
      {isEmpty ? (
        // Empty state
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Plus className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to your workspace
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Add your first panel to get started. Panels are like apps you can arrange however you like.
            </p>
            <button
              onClick={onAddPanel}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Panel
            </button>
          </div>
        </div>
      ) : (
        // Grid with panels
        <>
          <GridLayout
            {...gridConfig}
            layout={gridLayout}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".cursor-move"
          >
            {gridLayout.map((layoutItem) => {
              const panelData = panels[layoutItem.i];
              if (!panelData) return null;

              return (
                <div key={layoutItem.i}>
                  {renderPanel(layoutItem.i, panelData)}
                </div>
              );
            })}
          </GridLayout>

          {/* Floating Add and Settings Buttons */}
          <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
            <button
              onClick={onSettings}
              className="w-14 h-14 bg-white border border-gray-200 text-gray-700 rounded-full shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={onAddPanel}
              className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
              title="Add panel"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
