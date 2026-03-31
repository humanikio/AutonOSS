'use client';

import { Calendar, CheckSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface CreateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: () => void;
  onSelectTask: () => void;
  clickPosition?: { x: number; y: number } | null;
}

export default function CreateActionModal({
  isOpen,
  onClose,
  onSelectEvent,
  onSelectTask,
  clickPosition
}: CreateActionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style = clickPosition
    ? {
        position: 'fixed' as const,
        left: `${clickPosition.x}px`,
        top: `${clickPosition.y}px`,
        transform: 'translate(-50%, -50%)'
      }
    : {};

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      {/* Modal */}
      <div
        ref={modalRef}
        style={clickPosition ? style : {}}
        className={`backdrop-blur-xl bg-white/95 border border-white/50 rounded-2xl shadow-2xl p-4 ${
          !clickPosition ? 'max-w-sm w-full mx-4' : ''
        }`}
      >
        <h3 className="text-sm font-medium text-gray-700 mb-3">What would you like to create?</h3>

        <div className="space-y-2">
          {/* Create Event Option */}
          <button
            onClick={() => {
              onSelectEvent();
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">Event</div>
              <div className="text-xs text-gray-600">Time-bound with start & end</div>
            </div>
          </button>

          {/* Create Task Option */}
          <button
            onClick={() => {
              onSelectTask();
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">Task</div>
              <div className="text-xs text-gray-600">To-do with optional due date</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
