'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { 
  Zap, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  Circle,
  Target,
  MessageSquare,
  Phone,
  Users
} from 'lucide-react';

interface Action {
  id: string;
  name: string;
  description: string;
  type: 'nurture' | 'support' | 'followup' | 'custom';
  isActive: boolean;
  prompt: string;
  understanding?: {
    summary: string;
    behavior: string;
    tone: string;
    keyPoints: string[];
    confidence: number;
  };
}

interface ActionSelectorProps {
  agentId: string;
  selectedActionId: string | null;
  onActionSelect: (actionId: string | null) => void;
}

const getActionIcon = (type: Action['type']) => {
  switch (type) {
    case 'nurture':
      return <Users className="h-4 w-4" />;
    case 'support':
      return <MessageSquare className="h-4 w-4" />;
    case 'followup':
      return <Phone className="h-4 w-4" />;
    default:
      return <Target className="h-4 w-4" />;
  }
};

const getActionColor = (type: Action['type']) => {
  switch (type) {
    case 'nurture':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'support':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'followup':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    default:
      return 'text-orange-600 bg-orange-50 border-orange-200';
  }
};

export default function ActionSelector({ agentId, selectedActionId, onActionSelect }: ActionSelectorProps) {
  const { user, tenant } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  // Load actions for this agent
  useEffect(() => {
    if (!user?.uid || !tenant?.id || !agentId) {
      setLoading(false);
      return;
    }

    // Listen to actions collection for this agent
    const actionsRef = collection(db, 'tenants', tenant?.id, 'agents', agentId, 'actions');
    const q = query(actionsRef, where('isActive', '==', true));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const actionsList: Action[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          actionsList.push({
            id: doc.id,
            name: data.name || 'Unnamed Action',
            description: data.description || 'No description available',
            type: data.type || 'custom',
            isActive: data.isActive || false,
            prompt: data.prompt || '',
            understanding: data.understanding
          });
        });
        
        // Sort by name
        actionsList.sort((a, b) => a.name.localeCompare(b.name));
        setActions(actionsList);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading actions:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, tenant?.id, agentId]);

  const handleActionToggle = (actionId: string) => {
    if (selectedActionId === actionId) {
      // Deselect if already selected
      onActionSelect(null);
    } else {
      // Select new action
      onActionSelect(actionId);
    }
  };

  const toggleActionDetails = (actionId: string) => {
    setExpandedAction(expandedAction === actionId ? null : actionId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-600" />
          Select Training Action
        </h3>
        <p className="text-sm text-gray-600">
          Choose an action to test during this training session. The selected action will provide context and guidance for the agent's responses.
        </p>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Actions Available</h3>
          <p className="text-gray-500 mb-4">
            Create actions in the Actions tab to test them during training.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Clear Selection Option */}
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onActionSelect(null)}
                  className="flex items-center gap-2"
                >
                  {selectedActionId === null ? (
                    <CheckCircle className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                <div>
                  <h4 className="font-medium text-gray-900">No Action</h4>
                  <p className="text-sm text-gray-600">Train without specific action context</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Options */}
          {actions.map((action) => (
            <div 
              key={action.id} 
              className={`border rounded-lg transition-all ${
                selectedActionId === action.id 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => handleActionToggle(action.id)}
                      className="flex items-center gap-2"
                    >
                      {selectedActionId === action.id ? (
                        <CheckCircle className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{action.name}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(action.type)}`}>
                          {getActionIcon(action.type)}
                          {action.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{action.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleActionDetails(action.id)}
                    className="ml-2 p-1 hover:bg-gray-200 rounded"
                  >
                    {expandedAction === action.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedAction === action.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-3">
                      {action.understanding && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-1">Summary</h5>
                          <p className="text-sm text-gray-600">{action.understanding.summary}</p>
                        </div>
                      )}
                      
                      {action.prompt && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-1">Action Guidance</h5>
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                            {action.prompt}
                          </div>
                        </div>
                      )}
                      
                      {action.understanding?.keyPoints && action.understanding.keyPoints.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-1">Key Points</h5>
                          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                            {action.understanding.keyPoints.map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedActionId && (
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2 text-indigo-800">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Action selected: {actions.find(a => a.id === selectedActionId)?.name}
            </span>
          </div>
          <p className="text-xs text-indigo-600 mt-1">
            This action's context will be included in all training messages.
          </p>
        </div>
      )}
    </div>
  );
}