/**
 * NotesPanel
 *
 * Quick notes/scratchpad panel.
 * Simple textarea for quick thoughts.
 */

'use client';

import { useState } from 'react';
import { BasePanelProps, NotesPanelConfig } from '@/types/workspace/panel.types';
import PanelContainer from './PanelContainer';

interface NotesPanelProps extends BasePanelProps {
  config: NotesPanelConfig;
}

export default function NotesPanel({
  panelId,
  config,
  onClose
}: NotesPanelProps) {
  const [notes, setNotes] = useState('');

  return (
    <PanelContainer
      panelId={panelId}
      title={config.title || 'Notes'}
      onClose={onClose}
    >
      <div className="h-full p-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Quick notes..."
          className="w-full h-full p-2 text-sm border-0 focus:outline-none resize-none"
        />
      </div>
    </PanelContainer>
  );
}
