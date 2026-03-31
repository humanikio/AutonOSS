'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { setTokenGetter } from '@/lib/api/client';
import { pipelineService, Pipeline } from '../../services/pipelineService';
import { opportunityService, CreateOpportunityRequest, Opportunity, UpdateOpportunityRequest } from '../../services/opportunityService';
import { 
  Users, 
  Plus, 
  Download, 
  Grid3X3, 
  List, 
  Filter, 
  Search, 
  Settings2,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  Tag,
  User,
  MoreHorizontal,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Pipelines from './components/Pipelines';
import AIAssistant from './components/AIAssistant';
import AddOpportunityModal from '../../components/opportunities/AddOpportunityModal';
import OpportunityDetailsModal from '../../components/opportunities/OpportunityDetailsModal';

interface DisplayOpportunity {
  id: string;
  name: string;
  source: string;
  value: number;
  stage: string;
  avatar?: string;
  initials: string;
  actions: {
    calls: number;
    messages: number;
    emails: number;
    documents: number;
    tags: number;
  };
}

interface PipelineStage {
  name: string;
  count: number;
  value: number;
  opportunities: DisplayOpportunity[];
}

export default function OpportunitiesPage() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [aiAssistantPipeline, setAiAssistantPipeline] = useState(''); // Separate state for AI Assistant pipeline selection
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'pipelines' | 'ai-assistant'>('opportunities');
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddOpportunityModal, setShowAddOpportunityModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showPipelineSelector, setShowPipelineSelector] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set up token getter for API calls
  useEffect(() => {
    if (getToken) {
      setTokenGetter(getToken);
    }
  }, [getToken]);

  // Fetch pipelines on component mount
  useEffect(() => {
    const fetchPipelines = async () => {
      console.log('🔍 Current user:', user);
      if (!user) {
        console.log('🔍 No user found, skipping pipeline fetch');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log('🔍 About to fetch pipelines...');
        const fetchedPipelines = await pipelineService.getPipelines();
        console.log('🔍 Fetched pipelines:', fetchedPipelines);
        console.log('🔍 Pipeline count:', fetchedPipelines.length);
        setPipelines(fetchedPipelines);
        
        // Set the oldest pipeline as selected if none is selected
        if (fetchedPipelines.length > 0 && !selectedProgram) {
          // Sort by dateCreated to get the oldest pipeline first
          const sortedPipelines = [...fetchedPipelines].sort((a, b) => 
            new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
          );
          const oldestPipeline = sortedPipelines[0];
          console.log('🔍 Setting selected program to oldest pipeline:', oldestPipeline.id, oldestPipeline.name);
          setSelectedProgram(oldestPipeline.id);
        }
      } catch (err) {
        console.error('Error fetching pipelines:', err);
        setError('Failed to load pipelines');
      } finally {
        setLoading(false);
      }
    };

    fetchPipelines();
  }, [user]);

  // Fetch opportunities for selected pipeline
  useEffect(() => {
    const fetchOpportunities = async () => {
      if (!user || !selectedProgram) {
        setOpportunities([]);
        return;
      }
      
      try {
        console.log('🔍 Fetching opportunities for pipeline:', selectedProgram);
        console.log('🔍 Current user for auth:', user);
        const response = await opportunityService.getOpportunities({
          pipelineId: selectedProgram
        });
        console.log('🔍 Fetched opportunities:', response.opportunities);
        setOpportunities(response.opportunities);
      } catch (err) {
        console.error('Error fetching opportunities:', err);
        console.error('Error details:', err instanceof Error ? err.message : 'Unknown error');
        // Don't set error state for opportunities, just log it
        setOpportunities([]);
      }
    };

    fetchOpportunities();
  }, [user, selectedProgram]);

  // Handle opportunity creation
  const handleCreateOpportunity = async (opportunityData: any) => {
    try {
      // Convert form data to API format, ensuring value is a number
      const requestData: CreateOpportunityRequest = {
        ...opportunityData,
        value: typeof opportunityData.value === 'string' && opportunityData.value === '' ? 0 : Number(opportunityData.value)
      };
      
      await opportunityService.createOpportunity(requestData);
      console.log('Opportunity created successfully');
      
      // Refresh opportunities if it's for the currently selected pipeline
      if (requestData.pipelineId === selectedProgram) {
        const response = await opportunityService.getOpportunities({
          pipelineId: selectedProgram
        });
        setOpportunities(response.opportunities);
      }
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  // Handle opportunity details modal
  const handleOpenOpportunityDetails = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowDetailsModal(true);
  };

  const handleCloseOpportunityDetails = () => {
    setShowDetailsModal(false);
    setSelectedOpportunity(null);
  };

  // Handle opportunity update
  const handleUpdateOpportunity = async (opportunityId: string, updateData: UpdateOpportunityRequest) => {
    try {
      const updatedOpportunity = await opportunityService.updateOpportunity(opportunityId, updateData);
      
      // Update the opportunity in local state
      setOpportunities(prev => prev.map(opp => 
        opp.id === opportunityId ? updatedOpportunity : opp
      ));
      
      // Update selectedOpportunity if it's the one being updated
      if (selectedOpportunity && selectedOpportunity.id === opportunityId) {
        setSelectedOpportunity(updatedOpportunity);
      }
      
      console.log('Opportunity updated successfully');
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  // Handle opportunity delete
  const handleDeleteOpportunity = async (opportunityId: string) => {
    try {
      await opportunityService.deleteOpportunity(opportunityId);
      
      // Remove the opportunity from local state
      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId));
      
      console.log('Opportunity deleted successfully');
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  // Handle chat navigation to contact details
  const handleChatClick = (event: React.MouseEvent, contactId: string) => {
    event.stopPropagation(); // Prevent opportunity modal from opening
    if (contactId) {
      router.push(`/contacts/details/${contactId}`);
    }
  };

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(async (result: DropResult) => {
    setIsDragging(false);
    
    // Clear any existing scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area, do nothing
    if (!destination) {
      return;
    }

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the opportunity being moved
    const opportunityToMove = opportunities.find(opp => opp.id === draggableId);
    if (!opportunityToMove) {
      console.error('Opportunity not found:', draggableId);
      return;
    }

    // Find the target stage from the current pipeline
    const currentPipeline = pipelines.find(p => p.id === selectedProgram);
    const currentPipelineStages = currentPipeline?.stages || [];
    const targetStage = currentPipelineStages.find(stage => stage.id === destination.droppableId);
    if (!targetStage) {
      console.error('Target stage not found:', destination.droppableId);
      return;
    }

    // Store the original stage for potential rollback
    const originalStageId = opportunityToMove.stageId;

    // Immediately update local state for optimistic UI
    setOpportunities(prev => prev.map(opp => 
      opp.id === draggableId 
        ? { ...opp, stageId: destination.droppableId }
        : opp
    ));

    try {
      // Update the opportunity's stage in the backend
      await opportunityService.updateOpportunity(draggableId, {
        stageId: destination.droppableId
      });

      console.log(`Moved opportunity ${opportunityToMove.name} to stage ${targetStage.name}`);
    } catch (error) {
      console.error('Failed to move opportunity:', error);
      
      // Rollback the optimistic update on error
      setOpportunities(prev => prev.map(opp => 
        opp.id === draggableId 
          ? { ...opp, stageId: originalStageId }
          : opp
      ));
      
      // TODO: Show error toast to user
    }
  }, [opportunities, pipelines, selectedProgram]);

  // Auto-scroll functionality when dragging near screen edges
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const mouseX = e.clientX;
    const scrollThreshold = 100; // Distance from edge to start scrolling
    const scrollSpeed = 10;

    // Clear existing scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Check if mouse is near the right edge
    if (mouseX > containerRect.right - scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollBy({ left: scrollSpeed, behavior: 'smooth' });
      }, 16);
    }
    // Check if mouse is near the left edge
    else if (mouseX < containerRect.left + scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollBy({ left: -scrollSpeed, behavior: 'smooth' });
      }, 16);
    }
  }, [isDragging]);

  // Add/remove mouse move listener for auto-scroll
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
      };
    }
  }, [isDragging, handleMouseMove]);

  // Get the selected pipeline and its stages
  const selectedPipeline = pipelines.find(p => p.id === selectedProgram);
  const pipelineStages = selectedPipeline?.stages || [];
  
  console.log('🔍 Selected program ID:', selectedProgram);
  console.log('🔍 Selected pipeline:', selectedPipeline);
  console.log('🔍 Pipeline stages:', pipelineStages);

  // Convert pipeline stages to the format expected by the UI with real opportunities
  const displayStages: PipelineStage[] = pipelineStages.map(stage => {
    // Filter opportunities for this stage
    const stageOpportunities = opportunities.filter(opp => opp.stageId === stage.id);
    
    // Convert backend opportunities to display format
    const displayOpportunities: DisplayOpportunity[] = stageOpportunities.map(opp => ({
      id: opp.id,
      name: opp.name,
      source: opp.source,
      value: opp.value,
      stage: stage.name,
      initials: opp.contactName ? 
        opp.contactName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
        opp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      actions: {
        calls: 0,
        messages: 0,
        emails: 0,
        documents: 0,
        tags: opp.tags?.length || 0
      }
    }));

    // Calculate totals for this stage
    const totalValue = stageOpportunities.reduce((sum, opp) => sum + opp.value, 0);

    return {
      name: stage.name,
      count: stageOpportunities.length,
      value: totalValue,
      opportunities: displayOpportunities
    };
  });
  
  console.log('🔍 Display stages:', displayStages);

  const totalOpportunities = displayStages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {activeTab === 'ai-assistant' ? (
        /* AI Assistant Full Screen View */
        <div className="h-screen flex flex-col">
          {/* AI Assistant Header with Back Button and Pipeline Selector */}
          <div className="p-6 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('opportunities')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Opportunities</span>
            </button>
            
            <button
              onClick={() => setShowPipelineSelector(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Settings2 className="h-4 w-4" />
              <span>Select Existing Pipeline</span>
              {aiAssistantPipeline && (
                <span className="text-primary-600">
                  ({pipelines.find(p => p.id === aiAssistantPipeline)?.name || 'Selected'})
                </span>
              )}
            </button>
          </div>
          
          {/* AI Assistant Component - Full Height */}
          <div className="flex-1 px-6 pb-6 min-h-0">
            <AIAssistant 
              pipelines={pipelines} 
              selectedPipeline={aiAssistantPipeline} 
            />
          </div>
        </div>
      ) : (
        /* Regular Opportunities/Pipelines View */
        <div>
          {/* Fixed Header Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-light text-gray-900">Opportunities</h1>
                  <p className="text-gray-500 mt-1">Manage your sales pipeline and track opportunities</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowAddOpportunityModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add opportunity
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button 
                    onClick={() => setActiveTab('opportunities')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'opportunities'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Opportunities
                  </button>
                  <button 
                    onClick={() => setActiveTab('pipelines')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'pipelines'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pipelines
                  </button>
                  <button 
                    onClick={() => setActiveTab('ai-assistant')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      (activeTab as string) === 'ai-assistant'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    AI Assistant
                  </button>
                </nav>
              </div>

          {/* Controls - Only show for opportunities tab */}
          {activeTab === 'opportunities' && (
          <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {/* Program Selector */}
              <div className="relative">
                {loading ? (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-500">
                    Loading pipelines...
                  </div>
                ) : pipelines.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-500">
                    No pipelines available
                  </div>
                ) : (
                  <>
                    <select 
                      value={selectedProgram}
                      onChange={(e) => setSelectedProgram(e.target.value)}
                      className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {pipelines.map((pipeline) => (
                        <option key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </>
                )}
              </div>
              
              <div className="text-sm text-primary-600 font-medium">
                {totalOpportunities} opportunities
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Opportunities"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          </>
        )}
        </div>
      </div>
      
      {/* Pipeline Section - Isolated horizontal scroll */}
      {activeTab === 'opportunities' && (
      <div className="w-full overflow-hidden relative">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading pipeline stages...</p>
            </div>
          </div>
        ) : error ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-red-500 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* ONLY Stage Columns Scroll - Everything else is fixed above */}
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto pb-4 px-4 sm:px-6 lg:px-8"
              style={{
                scrollbarWidth: 'thin',
                width: '100%',
                maxWidth: '100vw',
                height: 'calc(100vh - 400px)',
                minHeight: '500px'
              }}
            >
          {displayStages.length === 0 ? (
            <div className="w-full bg-white rounded-lg p-8 text-center border border-gray-200">
              <p className="text-gray-500 mb-4">No stages available for this pipeline</p>
              <p className="text-sm text-gray-400">Create stages in the Pipeline management section</p>
            </div>
          ) : (
            displayStages.map((stage, stageIndex) => {
              // Find the corresponding pipeline stage to get the ID
              const pipelineStage = pipelineStages[stageIndex];
              if (!pipelineStage) return null;
              
              return (
            <div key={pipelineStage.id} className="bg-white border border-gray-200 rounded-xl flex-shrink-0 flex flex-col" style={{ width: '320px', height: '100%' }}>
              {/* Stage Header */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="font-medium text-gray-900 mb-1">{stage.name}</h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{stage.count} Opportunities</span>
                </div>
              </div>

              {/* Opportunities */}
              <Droppable droppableId={pipelineStage.id} type="OPPORTUNITY">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 space-y-4 min-h-[200px] transition-colors overflow-y-auto flex-1 ${
                      snapshot.isDraggingOver ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                    style={{ maxHeight: '100%' }}
                  >
                {stage.opportunities.length > 0 ? (
                  stage.opportunities.map((opportunity, index) => {
                    // Find the original opportunity data to pass to the modal
                    const originalOpportunity = opportunities.find(opp => opp.id === opportunity.id);
                    return (
                      <Draggable key={opportunity.id} draggableId={opportunity.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                            className={`border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer ${
                              snapshot.isDragging ? 'shadow-lg rotate-2 bg-white' : ''
                            }`}
                            onClick={(e) => {
                              // Prevent click when dragging
                              if (!snapshot.isDragging && originalOpportunity) {
                                handleOpenOpportunityDetails(originalOpportunity);
                              }
                            }}
                          >
                      {/* Opportunity Header */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{opportunity.name}</h4>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <User className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>

                      {/* Opportunity Details */}
                      <div className="space-y-2 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="text-gray-500">Opportunity Source:</span>
                          <span className="ml-2">{opportunity.source}</span>
                        </div>
                      </div>

                      {/* Chat Action */}
                      <div className="flex items-center justify-end">
                        <button
                          onClick={(e) => handleChatClick(e, originalOpportunity?.contactId || '')}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                          title="Open contact chat"
                        >
                          <MessageSquare className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                        </button>
                      </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No opportunities</p>
                  </div>
                )}
                {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
              );
            })
          )}
            </div>
          </DragDropContext>
        )}
      </div>
      )}

          {/* Pipelines Tab */}
          {activeTab === 'pipelines' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Pipelines />
            </div>
          )}
        </div>
      )}

      {/* Add Opportunity Modal */}
      <AddOpportunityModal
        isOpen={showAddOpportunityModal}
        onClose={() => setShowAddOpportunityModal(false)}
        onSave={handleCreateOpportunity}
        pipelines={pipelines}
      />

      {/* Opportunity Details Modal */}
      <OpportunityDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseOpportunityDetails}
        onUpdate={handleUpdateOpportunity}
        onDelete={handleDeleteOpportunity}
        opportunity={selectedOpportunity}
        pipelines={pipelines}
      />

      {/* Pipeline Selector Modal for AI Assistant */}
      {showPipelineSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Select Existing Pipeline</h3>
                <button
                  onClick={() => setShowPipelineSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Choose an existing pipeline to work with the AI Assistant
              </p>
            </div>
            
            <div className="overflow-y-auto max-h-64">
              {pipelines.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No pipelines available</p>
                  <p className="text-sm mt-1">Create a pipeline first in the Pipelines tab</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {/* Option to clear selection */}
                  <button
                    onClick={() => {
                      setAiAssistantPipeline('');
                      setShowPipelineSelector(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      !aiAssistantPipeline 
                        ? 'border-primary-200 bg-primary-50 text-primary-700' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">Create New Pipeline</div>
                    <div className="text-sm text-gray-500">Let AI create a new pipeline from scratch</div>
                  </button>
                  
                  {/* Existing pipelines */}
                  {pipelines.map((pipeline) => (
                    <button
                      key={pipeline.id}
                      onClick={() => {
                        setAiAssistantPipeline(pipeline.id);
                        setShowPipelineSelector(false);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        aiAssistantPipeline === pipeline.id 
                          ? 'border-primary-200 bg-primary-50 text-primary-700' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{pipeline.name}</div>
                      <div className="text-sm text-gray-500">
                        {pipeline.stages?.length || 0} stages
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}