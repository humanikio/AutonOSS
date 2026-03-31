'use client';

import { memo, useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, AlertCircle, Plus, Trash2, GitBranch } from 'lucide-react';
import { getIconComponent } from '@/lib/iconMapping';

export interface ActionNodeData {
  label: string;
  icon?: any;
  iconName?: string;
  subtitle?: string;
  hasError?: boolean;
  connectedHandles?: string[];
  onAddNode?: (nodeId: string, handleId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  nodeName?: string;
  nodeConfig?: any; // Full node configuration from registry
  categoryColor?: string; // Hex color from category (e.g., '#3B82F6')
}

interface ActionNodeProps {
  data: ActionNodeData;
  selected?: boolean;
  id?: string;
}

const ActionNode = ({ data, selected, id }: ActionNodeProps) => {
  // Defensive check: if no label, node data is corrupted
  if (!data?.label) {
    console.error('ActionNode: Missing label in node data', { id, data });
    return (
      <div className="bg-red-100 border-2 border-red-500 rounded p-4 min-w-[240px]">
        <div className="text-red-700 text-sm font-medium">⚠️ Node Error</div>
        <div className="text-red-600 text-xs mt-1">Missing node data</div>
      </div>
    );
  }

  // Get icon component using new mapping utility
  // Try iconName first (Lucide name), then icon (could be FA icon from backend or Lucide component)
  const Icon = getIconComponent(
    data.iconName || (typeof data.icon === 'string' ? data.icon : undefined),
    Zap
  );

  // Get category color or use default blue
  const categoryColor = data.categoryColor || '#3B82F6';

  // Helper to convert hex to rgba with opacity
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const connectedHandles = data.connectedHandles || [];
  const isRightHandleConnected = connectedHandles.includes('default');
  const [isHovered, setIsHovered] = useState(false);

  // Check if this node has conditional output
  const hasConditionalOutput = data.nodeConfig?._pulseline?.conditionalOutput?.enabled;
  const conditionalConfig = data.nodeConfig?._pulseline?.conditionalOutput;
  const isOutput0Connected = connectedHandles.includes('output_0');
  const isOutput1Connected = connectedHandles.includes('output_1');
  const [isHoldingPlus, setIsHoldingPlus] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const handleAddNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onAddNode && id) {
      data.onAddNode(id, 'default');
    }
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDeleteNode && id) {
      data.onDeleteNode(id);
    }
  };

  // Handle plus button press and hold
  const handlePlusMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Set up global mouseup listener immediately
    const handleGlobalMouseUp = (globalEvent: MouseEvent) => {
      // Clear timer if still running
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;

        // Was a quick click - add node
        handleAddNode(e);
      }

      // Reset state and remove listener
      setIsHoldingPlus(false);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };

    const handleGlobalMouseMove = (globalEvent: MouseEvent) => {
      // Only trigger if we're in hold mode
      if (holdTimerRef.current === null && handleRef.current) {
        // Dispatch mousedown on the handle to start ReactFlow drag
        const handleElement = handleRef.current;
        const rect = handleElement.getBoundingClientRect();

        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 0,
        });

        handleElement.dispatchEvent(mouseDownEvent);

        // Now dispatch mousemove to continue the drag
        const mouseMoveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: globalEvent.clientX,
          clientY: globalEvent.clientY,
        });

        document.dispatchEvent(mouseMoveEvent);

        // Remove this listener after triggering
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    // Start hold timer
    const timer = setTimeout(() => {
      setIsHoldingPlus(true);
      holdTimerRef.current = null; // Clear ref to indicate we're in hold mode
    }, 250); // 250ms hold to activate draw mode (increased for Windows compatibility)

    holdTimerRef.current = timer;
  };

  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-lg border-2 transition-all
        ${selected ? 'border-blue-500 shadow-xl' : 'border-gray-200 hover:border-gray-300'}
        ${data.hasError ? 'border-red-400' : ''}
      `}
      style={{ minWidth: '240px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover Menu */}
      {isHovered && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 rounded-lg shadow-xl px-2 py-1 flex items-center gap-1 z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            onClick={handleDeleteNode}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors text-white"
            title="Delete node"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Left Handle - Input (Receives Only) */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectableStart={false}
        className="w-6 h-6 !bg-blue-500 !border-3 !border-white !shadow-lg hover:!w-7 hover:!h-7 hover:!shadow-xl transition-all cursor-default"
        style={{ left: '-15px' }}
      />
      {/* Input Label */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 text-xs text-gray-400 pointer-events-none">
        ←
      </div>

      {/* Node Content */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{
              backgroundColor: data.hasError ? '#FEE2E2' : hexToRgba(categoryColor, 0.1)
            }}
          >
            {data.hasError ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Icon className="h-5 w-5" style={{ color: categoryColor }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: categoryColor }}
              >
                Action
              </span>
            </div>
            <h3 className="font-medium text-gray-900 text-sm mt-1">
              {data.label}
            </h3>
            {data.subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{data.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Conditional Output: Two Handles on Right Side */}
      {hasConditionalOutput ? (
        <>
          {/* Badge showing this has conditional logic */}
          <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full p-1 shadow-md z-10">
            <GitBranch className="h-3 w-3" />
          </div>

          {/* True Output (Top-right side) */}
          <Handle
            type="source"
            position={Position.Right}
            id="output_0"
            isConnectable={!isOutput0Connected}
            className={`transition-all !border-3 !border-white !shadow-lg ${
              isOutput0Connected
                ? 'w-3 h-3 !bg-gray-400 !cursor-not-allowed opacity-50'
                : 'w-3 h-3 !bg-white hover:!w-4 hover:!h-4 hover:!shadow-xl cursor-crosshair'
            }`}
            style={{ top: '40%', right: '-6px' }}
          />
          <div className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-6 text-xs text-gray-500 font-normal pointer-events-none whitespace-nowrap">
            {conditionalConfig?.trueLabel || 'true'}
          </div>

          {/* False Output (Bottom-right side) */}
          <Handle
            type="source"
            position={Position.Right}
            id="output_1"
            isConnectable={!isOutput1Connected}
            className={`transition-all !border-3 !border-white !shadow-lg ${
              isOutput1Connected
                ? 'w-3 h-3 !bg-gray-400 !cursor-not-allowed opacity-50'
                : 'w-3 h-3 !bg-white hover:!w-4 hover:!h-4 hover:!shadow-xl cursor-crosshair'
            }`}
            style={{ top: '60%', right: '-6px' }}
          />
          <div className="absolute right-0 top-[60%] -translate-y-1/2 translate-x-6 text-xs text-gray-500 font-normal pointer-events-none whitespace-nowrap">
            {conditionalConfig?.falseLabel || 'false'}
          </div>
        </>
      ) : (
        <>
          {/* Standard Single Output */}
          <Handle
            type="source"
            position={Position.Right}
            id="output_0"
            isConnectable={!isRightHandleConnected}
            className={`transition-all !border-3 !border-white !shadow-lg ${
              isHoldingPlus
                ? 'w-8 h-8 hover:!w-9 hover:!h-9 !shadow-xl cursor-crosshair z-50'
                : isRightHandleConnected
                ? 'w-6 h-6 !bg-gray-400 !cursor-not-allowed opacity-50'
                : 'w-6 h-6 hover:!w-7 hover:!h-7 hover:!shadow-xl cursor-crosshair'
            }`}
            style={{
              right: isHoldingPlus ? '-17px' : '-15px',
              backgroundColor: isRightHandleConnected ? '#9CA3AF' : categoryColor
            }}
          >
            <div ref={handleRef} className="w-full h-full" />
          </Handle>

          {/* Plus button for adding nodes (only show when not connected and not holding) */}
          {!isRightHandleConnected && !isHoldingPlus && (
            <div
              onMouseDown={handlePlusMouseDown}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 w-6 h-6 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer z-40 nodrag nopan"
              style={{ backgroundColor: categoryColor }}
              title="Click to add node, or hold to draw connection"
            >
              <Plus className="h-4 w-4 pointer-events-none" />
            </div>
          )}

          {/* Visual indicator when in hold/draw mode */}
          {!isRightHandleConnected && isHoldingPlus && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 pointer-events-none">
              <div className="w-6 h-6 rounded-full animate-pulse" style={{ backgroundColor: hexToRgba(categoryColor, 0.2) }}></div>
            </div>
          )}

          {/* Output Label (show checkmark when connected) */}
          {isRightHandleConnected && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 text-xs text-gray-400 pointer-events-none">
              ✓
            </div>
          )}
        </>
      )}

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-1 bg-blue-500 opacity-10 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};

export default memo(ActionNode);
