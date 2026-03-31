'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Layout } from 'react-grid-layout';
import WorkspaceCanvas from '@/components/workspace/WorkspaceCanvas';
import AddPanelModal from '@/components/workspace/AddPanelModal';
import { PanelType, PanelData, WorkspaceLayout } from '@/types/workspace/panel.types';
import { generatePanelId, getPanelTypeInfo } from '@/components/workspace/panels/panelRegistry';

interface Workspace {
  id: string;
  name: string;
  tenantId: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  metadata?: Record<string, any>;
}

export default function WorkspaceManagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;
  const router = useRouter();
  const { getToken } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Panel system state
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>({
    grid: [],
    panels: {}
  });
  const [showAddPanelModal, setShowAddPanelModal] = useState(false);

  // Load workspace data
  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setError('No auth token available');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspace(data.workspace);

        // Load layout from workspace metadata if it exists
        if (data.workspace.metadata?.layout) {
          setWorkspaceLayout(data.workspace.metadata.layout);
        }
      } else if (response.status === 404) {
        setError('Workspace not found');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load workspace' }));
        setError(errorData.message || 'Failed to load workspace');
      }
    } catch (error) {
      console.error('Error loading workspace:', error);
      setError('Error loading workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new panel
  const handleAddPanel = (panelType: PanelType) => {
    const panelInfo = getPanelTypeInfo(panelType);
    const panelId = generatePanelId(panelType);

    // Create new panel data
    const newPanel: PanelData = {
      id: panelId,
      type: panelType,
      config: {
        title: panelInfo.label
      }
    };

    // Find a good position for the new panel (top-left available space)
    const newLayoutItem: Layout = {
      i: panelId,
      x: 0, // Will be auto-positioned by react-grid-layout
      y: Infinity, // Put at the bottom
      w: panelInfo.defaultSize.w,
      h: panelInfo.defaultSize.h,
      minW: 2,
      minH: 2
    };

    // Update state
    setWorkspaceLayout({
      grid: [...workspaceLayout.grid, newLayoutItem],
      panels: {
        ...workspaceLayout.panels,
        [panelId]: newPanel
      }
    });
  };

  // Handle layout changes (drag/resize/close)
  const handleLayoutChange = (newLayout: WorkspaceLayout) => {
    setWorkspaceLayout(newLayout);

    // TODO: Debounce and save to backend
    // saveLayoutToBackend(newLayout);
  };

  // Save layout to backend (TODO: Implement)
  const saveLayoutToBackend = async (layout: WorkspaceLayout) => {
    try {
      const token = await getToken();
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          metadata: {
            ...workspace?.metadata,
            layout
          }
        })
      });
    } catch (error) {
      console.error('Error saving layout:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700 mb-4">{error || 'Workspace not found'}</p>
            <button
              onClick={() => router.push('/workspaces')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Workspaces
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <WorkspaceCanvas
        workspaceId={workspaceId}
        initialLayout={workspaceLayout}
        onLayoutChange={handleLayoutChange}
        onAddPanel={() => setShowAddPanelModal(true)}
        onSettings={() => {}} // TODO: Implement settings modal
      />

      <AddPanelModal
        isOpen={showAddPanelModal}
        onClose={() => setShowAddPanelModal(false)}
        onSelectPanel={handleAddPanel}
      />
    </>
  );
}
