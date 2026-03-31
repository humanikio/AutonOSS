'use client';

import { memo, useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { getIconComponent } from '@/lib/iconMapping';

interface ConditionNodeData {
  label: string;
  icon?: any;
  iconName?: string;
  subtitle?: string;
  hasError?: boolean;
  connectedHandles?: string[];
  onAddNode?: (nodeId: string, handleId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  nodeName?: string;
  nodeConfig?: any;
}

interface ConditionNodeProps {
  data: ConditionNodeData;
  selected?: boolean;
  id?: string;
}

const ConditionNode = ({ data, selected, id }: ConditionNodeProps) => {
  // Defensive check: if no label, node data is corrupted
  if (!data?.label) {
    console.error('ConditionNode: Missing label in node data', { id, data });
    return (
      <div className="bg-red-100 border-2 border-red-500 rounded p-4 min-w-[240px]">
        <div className="text-red-700 text-sm font-medium">⚠️ Node Error</div>
        <div className="text-red-600 text-xs mt-1">Missing node data</div>
      </div>
    );
  }

  // Get icon component using new mapping utility
  const Icon = getIconComponent(
    data.iconName || (typeof data.icon === 'string' ? data.icon : undefined),
    GitBranch
  );

  const connectedHandles = data.connectedHandles || [];
  const isTrueHandleConnected = connectedHandles.includes('true');
  const isFalseHandleConnected = connectedHandles.includes('false');
  const [isHovered, setIsHovered] = useState(false);
  const [isHoldingTrueButton, setIsHoldingTrueButton] = useState(false);
  const [isHoldingFalseButton, setIsHoldingFalseButton] = useState(false);
  const holdTrueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdFalseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trueHandleRef = useRef<HTMLDivElement>(null);
  const falseHandleRef = useRef<HTMLDivElement>(null);

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDeleteNode && id) {
      data.onDeleteNode(id);
    }
  };

  const handleAddNodeTrue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onAddNode && id) {
      data.onAddNode(id, 'true');
    }
  };

  const handleAddNodeFalse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onAddNode && id) {
      data.onAddNode(id, 'false');
    }
  };

  // Handle true button press and hold
  const handleTrueButtonMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const handleGlobalMouseUp = (globalEvent: MouseEvent) => {
      if (holdTrueTimerRef.current) {
        clearTimeout(holdTrueTimerRef.current);
        holdTrueTimerRef.current = null;
        // Quick click - add node via action panel
        if (data.onAddNode && id) {
          data.onAddNode(id, 'true');
        }
      }
      setIsHoldingTrueButton(false);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };

    const handleGlobalMouseMove = (globalEvent: MouseEvent) => {
      if (holdTrueTimerRef.current === null && trueHandleRef.current) {
        const handleElement = trueHandleRef.current;
        const rect = handleElement.getBoundingClientRect();

        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 0,
        });
        handleElement.dispatchEvent(mouseDownEvent);

        const mouseMoveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: globalEvent.clientX,
          clientY: globalEvent.clientY,
        });
        document.dispatchEvent(mouseMoveEvent);

        window.removeEventListener('mousemove', handleGlobalMouseMove);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    const timer = setTimeout(() => {
      setIsHoldingTrueButton(true);
      holdTrueTimerRef.current = null;
    }, 250); // 250ms hold to activate draw mode (increased for Windows compatibility)

    holdTrueTimerRef.current = timer;
  };

  // Handle false button press and hold
  const handleFalseButtonMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const handleGlobalMouseUp = (globalEvent: MouseEvent) => {
      if (holdFalseTimerRef.current) {
        clearTimeout(holdFalseTimerRef.current);
        holdFalseTimerRef.current = null;
        // Quick click - add node via action panel
        if (data.onAddNode && id) {
          data.onAddNode(id, 'false');
        }
      }
      setIsHoldingFalseButton(false);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };

    const handleGlobalMouseMove = (globalEvent: MouseEvent) => {
      if (holdFalseTimerRef.current === null && falseHandleRef.current) {
        const handleElement = falseHandleRef.current;
        const rect = handleElement.getBoundingClientRect();

        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 0,
        });
        handleElement.dispatchEvent(mouseDownEvent);

        const mouseMoveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: globalEvent.clientX,
          clientY: globalEvent.clientY,
        });
        document.dispatchEvent(mouseMoveEvent);

        window.removeEventListener('mousemove', handleGlobalMouseMove);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    const timer = setTimeout(() => {
      setIsHoldingFalseButton(true);
      holdFalseTimerRef.current = null;
    }, 250); // 250ms hold to activate draw mode (increased for Windows compatibility)

    holdFalseTimerRef.current = timer;
  };

  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-lg border-2 transition-all
        ${selected ? 'border-purple-500 shadow-xl' : 'border-gray-200 hover:border-gray-300'}
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
          <div className={`
            p-2 rounded-lg flex-shrink-0
            ${data.hasError ? 'bg-red-50' : 'bg-purple-50'}
          `}>
            {data.hasError ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Icon className="h-5 w-5 text-purple-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                Condition
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

      {/* True Output (Top-right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        ref={trueHandleRef}
        isConnectable={!isTrueHandleConnected}
        className={`transition-all !border-3 !border-white !shadow-lg ${
          isTrueHandleConnected
            ? 'w-4 h-4 !bg-gray-400 !cursor-not-allowed opacity-50'
            : 'w-4 h-4 !bg-white hover:!w-5 hover:!h-5 hover:!shadow-xl cursor-crosshair'
        }`}
        style={{ top: '35%', right: '-8px' }}
      />

      {/* True label and plus button */}
      {!isTrueHandleConnected && (
        <>
          <div className="absolute right-0 top-[35%] -translate-y-1/2 translate-x-6 text-xs text-gray-500 font-normal pointer-events-none whitespace-nowrap">
            true
          </div>
          <button
            onMouseDown={handleTrueButtonMouseDown}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className={`absolute right-0 top-[35%] -translate-y-1/2 translate-x-16 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer z-40 nodrag nopan ${
              isHoldingTrueButton ? 'scale-90 opacity-50' : ''
            }`}
            title="Click to add node or hold to draw connection"
          >
            <Plus className="h-4 w-4" />
          </button>
        </>
      )}
      {isTrueHandleConnected && (
        <div className="absolute right-0 top-[35%] -translate-y-1/2 translate-x-6 text-xs text-gray-400 pointer-events-none whitespace-nowrap">
          true ✓
        </div>
      )}

      {/* False Output (Bottom-right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        ref={falseHandleRef}
        isConnectable={!isFalseHandleConnected}
        className={`transition-all !border-3 !border-white !shadow-lg ${
          isFalseHandleConnected
            ? 'w-4 h-4 !bg-gray-400 !cursor-not-allowed opacity-50'
            : 'w-4 h-4 !bg-white hover:!w-5 hover:!h-5 hover:!shadow-xl cursor-crosshair'
        }`}
        style={{ top: '65%', right: '-8px' }}
      />

      {/* False label and plus button */}
      {!isFalseHandleConnected && (
        <>
          <div className="absolute right-0 top-[65%] -translate-y-1/2 translate-x-6 text-xs text-gray-500 font-normal pointer-events-none whitespace-nowrap">
            false
          </div>
          <button
            onMouseDown={handleFalseButtonMouseDown}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className={`absolute right-0 top-[65%] -translate-y-1/2 translate-x-16 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer z-40 nodrag nopan ${
              isHoldingFalseButton ? 'scale-90 opacity-50' : ''
            }`}
            title="Click to add node or hold to draw connection"
          >
            <Plus className="h-4 w-4" />
          </button>
        </>
      )}
      {isFalseHandleConnected && (
        <div className="absolute right-0 top-[65%] -translate-y-1/2 translate-x-6 text-xs text-gray-400 pointer-events-none whitespace-nowrap">
          false ✓
        </div>
      )}

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-1 bg-purple-500 opacity-10 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};

export default memo(ConditionNode);
