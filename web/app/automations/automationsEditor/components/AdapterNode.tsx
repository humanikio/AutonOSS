/**
 * Adapter Node Component
 *
 * This component renders adapter nodes (contactAdapter, etc.) as invisible/hidden nodes.
 * Adapters are automatically injected by the backend custom field resolver and should
 * not be visible in the UI. However, they still need to exist in the React Flow graph
 * for edge connections to work properly.
 *
 * Visual Design:
 * - Minimal footprint (small or hidden)
 * - No visual node card
 * - Edges pass through without visual interruption
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface AdapterNodeProps {
  data: {
    label: string;
    nodeName: string;
    _isAdapter?: boolean;
    _adapterType?: string;
  };
  id: string;
}

export default function AdapterNode({ data, id }: AdapterNodeProps) {
  // Render completely invisible - only handles are present for connections
  return (
    <div
      className="adapter-node"
      style={{
        width: 0,
        height: 0,
        position: 'relative',
        opacity: 0,
        pointerEvents: 'none', // Prevent interaction
      }}
    >
      {/* Input handle - invisible but functional */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Output handle - invisible but functional */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Debug info - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div
          className="adapter-debug-label"
          style={{
            position: 'absolute',
            top: -20,
            left: 0,
            fontSize: 8,
            color: '#999',
            whiteSpace: 'nowrap',
            opacity: 0.3,
            pointerEvents: 'none',
          }}
        >
          {data._adapterType || 'adapter'}
        </div>
      )}
    </div>
  );
}
