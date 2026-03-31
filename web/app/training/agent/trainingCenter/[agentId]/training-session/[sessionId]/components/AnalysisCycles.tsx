'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AnalysisCycle } from '@/types/analysis';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Brain, 
  TrendingUp, 
  MessageSquare, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Settings,
  Eye,
  Loader2,
  X
} from 'lucide-react';

interface AnalysisCyclesProps {
  tenantId: string;
  sessionId: string;
  agentId?: string;
}

interface SelectedSuggestions {
  promptChanges: boolean;
  settingChanges: string[];
  knowledgeBaseChanges: string[];
}

interface SuggestionApplicationState {
  isApplying: boolean;
  showSelectionModal: boolean;
  currentCycle: AnalysisCycle | null;
  selectedSuggestions: SelectedSuggestions;
  lastAppliedCycle: string | null;
}

export default function AnalysisCycles({ tenantId, sessionId, agentId }: AnalysisCyclesProps) {
  const { user, getToken } = useAuth();
  const [cycles, setCycles] = useState<AnalysisCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
  
  // Suggestion application state
  const [suggestionState, setSuggestionState] = useState<SuggestionApplicationState>({
    isApplying: false,
    showSelectionModal: false,
    currentCycle: null,
    selectedSuggestions: {
      promptChanges: false,
      settingChanges: [],
      knowledgeBaseChanges: []
    },
    lastAppliedCycle: null
  });

  // Fetch analysis cycles from Firestore
  useEffect(() => {
    if (!tenantId || !sessionId) {
      setLoading(false);
      return;
    }

    const cyclesRef = collection(
      db, 
      'tenants', 
      tenantId, 
      'trainingSessions', 
      sessionId, 
      'analysisCycles'
    );
    
    const q = query(cyclesRef, orderBy('cycleNumber', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cyclesData: AnalysisCycle[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          cyclesData.push({
            cycleId: doc.id,
            ...data
          } as AnalysisCycle);
        });
        
        setCycles(cyclesData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching analysis cycles:', error);
        setError('Failed to load analysis cycles');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId, sessionId]);

  // Toggle cycle expansion
  const toggleCycle = (cycleId: string) => {
    const newExpanded = new Set(expandedCycles);
    if (newExpanded.has(cycleId)) {
      newExpanded.delete(cycleId);
    } else {
      newExpanded.add(cycleId);
    }
    setExpandedCycles(newExpanded);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Apply suggestions to test agent
  const applySuggestions = async (cycleId: string, selectedSuggestions?: SelectedSuggestions) => {
    try {
      setSuggestionState(prev => ({ ...prev, isApplying: true }));
      
      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      if (!user) {
        throw new Error('User authentication required');
      }

      // Get Firebase auth token
      const token = await getToken();

      const response = await fetch(`/api/agent-training/sessions/${sessionId}/agents/${agentId}/apply-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cycleId,
          tenantId,
          selectedSuggestions: selectedSuggestions || undefined // undefined = apply all
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.details || data.error || 'Failed to apply suggestions');
      }

      // Update state to show success
      setSuggestionState(prev => ({
        ...prev,
        isApplying: false,
        showSelectionModal: false,
        lastAppliedCycle: cycleId,
        currentCycle: null
      }));

      // Show success message (you could add a toast notification here)
      console.log('✅ Suggestions applied successfully:', data.data);
      
    } catch (error) {
      console.error('❌ Failed to apply suggestions:', error);
      setSuggestionState(prev => ({ ...prev, isApplying: false }));
      // Show error message (you could add a toast notification here)
      alert(`Failed to apply suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Quick apply all suggestions
  const handleQuickApply = (cycle: AnalysisCycle) => {
    applySuggestions(cycle.cycleId);
  };

  // Open selection modal
  const handleSelectiveApply = (cycle: AnalysisCycle) => {
    // Initialize selections based on available suggestions
    const initialSelections: SelectedSuggestions = {
      promptChanges: !!cycle.suggestions?.promptChanges,
      settingChanges: cycle.suggestions?.settingChanges ? Object.keys(cycle.suggestions.settingChanges) : [],
      knowledgeBaseChanges: cycle.suggestions?.knowledgeBaseChanges ? Object.keys(cycle.suggestions.knowledgeBaseChanges) : []
    };

    setSuggestionState(prev => ({
      ...prev,
      showSelectionModal: true,
      currentCycle: cycle,
      selectedSuggestions: initialSelections
    }));
  };

  // Apply selected suggestions
  const handleApplySelected = () => {
    if (suggestionState.currentCycle) {
      applySuggestions(suggestionState.currentCycle.cycleId, suggestionState.selectedSuggestions);
    }
  };

  // Close selection modal
  const closeSelectionModal = () => {
    setSuggestionState(prev => ({
      ...prev,
      showSelectionModal: false,
      currentCycle: null
    }));
  };

  // Update selected suggestions
  const updateSelectedSuggestions = (updates: Partial<SelectedSuggestions>) => {
    setSuggestionState(prev => ({
      ...prev,
      selectedSuggestions: { ...prev.selectedSuggestions, ...updates }
    }));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-indigo-600 mb-3 text-sm font-semibold">$ cycles --loading</div>
        <div className="flex items-center gap-2 text-gray-500 text-sm pl-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          <span>Loading analysis cycles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-indigo-600 mb-3 text-sm font-semibold">$ cycles --error</div>
        <div className="text-red-500 text-sm pl-2">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="p-6">
        <div className="text-indigo-600 mb-3 text-sm font-semibold">$ cycles --list</div>
        <div className="text-gray-500 text-sm pl-2">
          No analysis cycles yet. Cycles will appear as the conversation progresses.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="text-indigo-600 mb-3 text-sm font-semibold">
        $ cycles --list ({cycles.length} cycles)
      </div>
      
      <div className="space-y-3">
        {cycles.map((cycle) => {
          const isExpanded = expandedCycles.has(cycle.cycleId);
          
          return (
            <div key={cycle.cycleId} className="border border-gray-200 rounded-lg bg-gray-50">
              {/* Cycle Header - Always Visible */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleCycle(cycle.cycleId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <Brain className="h-4 w-4 text-indigo-600" />
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Cycle #{cycle.cycleNumber}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(cycle.timestamp)} • {cycle.conversationContext.messageCount} messages
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {cycle.suggestionsGenerated && (
                      <span title="Has suggestions">
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                      </span>
                    )}
                    <span title="Completed">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </span>
                  </div>
                </div>
                
                {/* Quick Preview - Always Visible */}
                <div className="mt-2 text-xs text-gray-600 pl-6">
                  <span className="text-indigo-500">{"> "}</span>
                  {cycle.analysis.substring(0, 120)}
                  {cycle.analysis.length > 120 ? '...' : ''}
                </div>

                {/* Quick Action Buttons - Always Visible if suggestions available */}
                {cycle.suggestionsGenerated && cycle.suggestions && (
                  <div className="mt-3 flex items-center justify-between pl-6 pr-2">
                    <div className="text-xs text-amber-600 font-medium">
                      💡 Suggestions available
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickApply(cycle);
                        }}
                        disabled={suggestionState.isApplying}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {suggestionState.isApplying && suggestionState.lastAppliedCycle !== cycle.cycleId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Apply All
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectiveApply(cycle);
                        }}
                        disabled={suggestionState.isApplying}
                        className="flex items-center gap-1 px-2 py-1 bg-white text-gray-700 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Settings className="h-3 w-3" />
                        Select
                      </button>
                      
                      {suggestionState.lastAppliedCycle === cycle.cycleId && (
                        <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                          <CheckCircle className="h-3 w-3" />
                          Applied
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-white">
                  {/* Analysis Section */}
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">Analysis</span>
                      </div>
                      <div className="text-sm text-gray-700 pl-6 leading-relaxed">
                        {cycle.analysis}
                      </div>
                    </div>

                    {/* Conversation Context */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">Context</span>
                      </div>
                      <div className="text-xs text-gray-600 pl-6 grid grid-cols-2 gap-2">
                        <div>Messages: {cycle.conversationContext.messageCount}</div>
                        <div>User: {cycle.conversationContext.userMessages}</div>
                        <div>Agent: {cycle.conversationContext.agentMessages}</div>
                        <div>RAG Usage: {cycle.conversationContext.ragUsage}</div>
                        <div>Docs Used: {cycle.conversationContext.documentsUsed}</div>
                        <div>Has Summary: {cycle.conversationContext.hasSummary ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    {/* Suggestions Section */}
                    {cycle.suggestionsGenerated && cycle.suggestions && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-gray-900">Improvement Suggestions</span>
                        </div>
                        
                        <div className="pl-6 space-y-3">
                          {cycle.suggestions.reasoning && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Reasoning:</div>
                              <div className="text-xs text-gray-600 bg-amber-50 p-2 rounded border">
                                {cycle.suggestions.reasoning}
                              </div>
                            </div>
                          )}
                          
                          {cycle.suggestions.promptChanges && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Prompt Changes:</div>
                              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border">
                                {cycle.suggestions.promptChanges}
                              </div>
                            </div>
                          )}
                          
                          {cycle.suggestions.settingChanges && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Setting Changes:</div>
                              <div className="text-xs text-gray-600 bg-green-50 p-2 rounded border">
                                <pre className="whitespace-pre-wrap">
                                  {typeof cycle.suggestions.settingChanges === 'string' 
                                    ? cycle.suggestions.settingChanges 
                                    : JSON.stringify(cycle.suggestions.settingChanges, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {cycle.suggestions.knowledgeBaseChanges && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Knowledge Base Changes:</div>
                              <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded border">
                                <pre className="whitespace-pre-wrap">
                                  {typeof cycle.suggestions.knowledgeBaseChanges === 'string' 
                                    ? cycle.suggestions.knowledgeBaseChanges 
                                    : JSON.stringify(cycle.suggestions.knowledgeBaseChanges, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Suggestion Action Buttons */}
                        <div className="mt-4 flex items-center gap-2 pl-6">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickApply(cycle);
                            }}
                            disabled={suggestionState.isApplying}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {suggestionState.isApplying && suggestionState.lastAppliedCycle !== cycle.cycleId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Apply All
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectiveApply(cycle);
                            }}
                            disabled={suggestionState.isApplying}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 text-xs rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Settings className="h-3 w-3" />
                            Review & Apply
                          </button>
                          
                          {suggestionState.lastAppliedCycle === cycle.cycleId && (
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              <CheckCircle className="h-3 w-3" />
                              Applied
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection Modal */}
      {suggestionState.showSelectionModal && suggestionState.currentCycle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Apply Suggestions - Cycle #{suggestionState.currentCycle.cycleNumber}
                </h3>
              </div>
              <button
                onClick={closeSelectionModal}
                className="p-1 hover:bg-gray-100 rounded-md"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Select which suggestions you'd like to apply to your test agent configuration:
              </p>

              {/* Prompt Changes */}
              {suggestionState.currentCycle.suggestions?.promptChanges && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="promptChanges"
                      checked={suggestionState.selectedSuggestions.promptChanges}
                      onChange={(e) => updateSelectedSuggestions({ promptChanges: e.target.checked })}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="promptChanges" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Apply Prompt Changes
                      </label>
                      <div className="mt-1 text-xs text-gray-600 bg-blue-50 p-2 rounded border">
                        {suggestionState.currentCycle.suggestions.promptChanges}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Setting Changes */}
              {suggestionState.currentCycle.suggestions?.settingChanges && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="settingChanges"
                      checked={suggestionState.selectedSuggestions.settingChanges.length > 0}
                      onChange={(e) => {
                        const allSettings = Object.keys(suggestionState.currentCycle!.suggestions!.settingChanges || {});
                        updateSelectedSuggestions({ 
                          settingChanges: e.target.checked ? allSettings : [] 
                        });
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="settingChanges" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Apply Setting Changes
                      </label>
                      <div className="mt-1 text-xs text-gray-600 bg-green-50 p-2 rounded border">
                        <pre className="whitespace-pre-wrap">
                          {typeof suggestionState.currentCycle.suggestions.settingChanges === 'string' 
                            ? suggestionState.currentCycle.suggestions.settingChanges 
                            : JSON.stringify(suggestionState.currentCycle.suggestions.settingChanges, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Knowledge Base Changes */}
              {suggestionState.currentCycle.suggestions?.knowledgeBaseChanges && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="knowledgeBaseChanges"
                      checked={suggestionState.selectedSuggestions.knowledgeBaseChanges.length > 0}
                      onChange={(e) => {
                        const allKBChanges = Object.keys(suggestionState.currentCycle!.suggestions!.knowledgeBaseChanges || {});
                        updateSelectedSuggestions({ 
                          knowledgeBaseChanges: e.target.checked ? allKBChanges : [] 
                        });
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="knowledgeBaseChanges" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Apply Knowledge Base Changes
                      </label>
                      <div className="mt-1 text-xs text-gray-600 bg-purple-50 p-2 rounded border">
                        <pre className="whitespace-pre-wrap">
                          {typeof suggestionState.currentCycle.suggestions.knowledgeBaseChanges === 'string' 
                            ? suggestionState.currentCycle.suggestions.knowledgeBaseChanges 
                            : JSON.stringify(suggestionState.currentCycle.suggestions.knowledgeBaseChanges, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeSelectionModal}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySelected}
                disabled={suggestionState.isApplying || (
                  !suggestionState.selectedSuggestions.promptChanges &&
                  suggestionState.selectedSuggestions.settingChanges.length === 0 &&
                  suggestionState.selectedSuggestions.knowledgeBaseChanges.length === 0
                )}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestionState.isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Apply Selected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}