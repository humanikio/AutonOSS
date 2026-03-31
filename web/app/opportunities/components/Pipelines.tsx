'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, AlertTriangle, GripVertical } from 'lucide-react';
import { pipelineService, Pipeline, PipelineStage } from '../../../services/pipelineService';
import { useAuth } from '@/contexts/AuthContext';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pipeline: { name: string; stages: PipelineStage[] }) => void;
  editingPipeline?: Pipeline | null;
  mode: 'create' | 'edit';
}

function PipelineModal({ isOpen, onClose, onSave, editingPipeline, mode }: PipelineModalProps) {
  const [pipelineName, setPipelineName] = useState('');
  const [stages, setStages] = useState<PipelineStage[]>([
    { id: '1', name: '' }
  ]);
  const [originalData, setOriginalData] = useState<{ name: string; stages: PipelineStage[] }>({ name: '', stages: [] });
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing pipeline data when editing
  useEffect(() => {
    if (mode === 'edit' && editingPipeline) {
      setPipelineName(editingPipeline.name);

      // Convert backend stages to modal format
      const modalStages = editingPipeline.stages?.map((stage, index) => ({
        id: stage.id || index.toString(),
        name: stage.name
      })) || [{ id: '1', name: '' }];

      setStages(modalStages);

      // Store original data for comparison
      setOriginalData({
        name: editingPipeline.name,
        stages: JSON.parse(JSON.stringify(modalStages))
      });
      setHasChanges(false);
    } else if (mode === 'create') {
      // Reset for new pipeline
      setPipelineName('');
      setStages([{ id: '1', name: '' }]);
      setOriginalData({ name: '', stages: [] });
      setHasChanges(false);
    }
  }, [mode, editingPipeline, isOpen]);

  // Detect changes
  useEffect(() => {
    if (mode === 'create') {
      // For create mode, check if user has entered any data
      const hasData = pipelineName.trim() !== '' || stages.some(s => s.name.trim() !== '');
      setHasChanges(hasData);
    } else if (mode === 'edit') {
      // For edit mode, compare with original data
      const nameChanged = pipelineName !== originalData.name;
      const stagesChanged = JSON.stringify(stages) !== JSON.stringify(originalData.stages);
      setHasChanges(nameChanged || stagesChanged);
    }
  }, [pipelineName, stages, originalData, mode]);

  const addStage = () => {
    const newStage: PipelineStage = {
      id: Date.now().toString(),
      name: ''
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (id: string) => {
    setStages(stages.filter(stage => stage.id !== id));
  };

  const updateStageName = (id: string, name: string) => {
    setStages(stages.map(stage => 
      stage.id === id ? { ...stage, name } : stage
    ));
  };

  const handleSave = async () => {
    if (pipelineName.trim() && stages.some(stage => stage.name.trim())) {
      const pipelineData = {
        name: pipelineName,
        stages: stages.filter(stage => stage.name.trim())
      };
      
      try {
        await onSave(pipelineData);
        setPipelineName('');
        setStages([{ id: '1', name: '' }]);
        onClose();
      } catch (error) {
        console.error('Failed to save pipeline:', error);
        // TODO: Show error message to user
      }
    }
  };

  const handleCancel = () => {
    setPipelineName('');
    setStages([{ id: '1', name: '' }]);
    onClose();
  };

  const handleStageReorder = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStages(items);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            {mode === 'create' ? <Plus className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
            {mode === 'create' ? 'Add pipeline' : 'Edit pipeline'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
          {/* Pipeline Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pipeline Name
            </label>
            <input
              type="text"
              placeholder="Name"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Stages */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Stage Name
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Actions
              </label>
            </div>

            <DragDropContext onDragEnd={handleStageReorder}>
              <Droppable droppableId="pipeline-stages">
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-gray-50 rounded-lg p-2' : ''}`}
                  >
                    {stages.map((stage, index) => (
                      <Draggable key={stage.id} draggableId={stage.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 ${
                              snapshot.isDragging ? 'bg-white shadow-lg rounded-lg' : ''
                            }`}
                          >
                            <div 
                              {...provided.dragHandleProps}
                              className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing transition-colors"
                              title="Drag to reorder"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <input
                              type="text"
                              placeholder="Stage Name"
                              value={stage.name}
                              onChange={(e) => updateStageName(stage.id, e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <div className="flex items-center gap-2">
                              {stages.length > 1 && (
                                <button
                                  onClick={() => removeStage(stage.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove stage"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <button
              onClick={addStage}
              className="mt-4 flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add stage
            </button>
          </div>

          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-xl">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 text-white rounded-lg transition-all ${
              hasChanges
                ? 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/50 ring-2 ring-primary-300 animate-pulse'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {mode === 'create' ? 'Save' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pipelineName: string;
  isDeleting: boolean;
}

function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  pipelineName, 
  isDeleting 
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Delete Pipeline</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            Are you sure you want to delete the pipeline:
          </p>
          <p className="font-medium text-gray-900 mb-4">
            "{pipelineName}"
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> This action cannot be undone. All opportunities in this pipeline will be permanently deleted.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Pipeline
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Pipelines() {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState<Pipeline | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch pipelines on component mount
  useEffect(() => {
    const fetchPipelines = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        const fetchedPipelines = await pipelineService.getPipelines();
        setPipelines(fetchedPipelines);
      } catch (err) {
        console.error('Error fetching pipelines:', err);
        setError('Failed to load pipelines');
      } finally {
        setLoading(false);
      }
    };

    fetchPipelines();
  }, [user]);

  const handleSavePipeline = async (pipelineData: { name: string; stages: PipelineStage[] }) => {
    console.log('🔵 Starting save pipeline...', { modalMode, pipelineData });

    try {
      if (modalMode === 'create') {
        // Create new pipeline
        const newPipeline = await pipelineService.createPipeline({
          name: pipelineData.name,
          stages: pipelineData.stages.map((stage, index) => ({
            name: stage.name,
            order: index
          }))
        });

        setPipelines(prev => [...prev, newPipeline]);
        console.log('✅ Pipeline created successfully');
      } else if (modalMode === 'edit' && editingPipeline) {
        console.log('🔵 Updating pipeline name...');
        // Update existing pipeline
        await pipelineService.updatePipeline(editingPipeline.id, {
          name: pipelineData.name
        });

        console.log('🔵 Updating stages...');
        // Update stages - this is more complex as we need to handle adds/deletes/updates
        await handleStageUpdates(editingPipeline.id, pipelineData.stages);

        console.log('🔵 Refreshing pipelines list...');
        // Refresh pipelines list
        const updatedPipelines = await pipelineService.getPipelines();
        setPipelines(updatedPipelines);
        console.log('✅ Pipeline updated successfully');
      }
    } catch (error) {
      console.error('❌ Error saving pipeline:', error);
      throw error;
    }
  };

  const handleStageUpdates = async (pipelineId: string, newStages: PipelineStage[]) => {
    console.log('🔵 handleStageUpdates called', { pipelineId, newStagesCount: newStages.length });

    try {
      // Get the current pipeline to compare stages
      const currentPipeline = pipelines.find(p => p.id === pipelineId);
      if (!currentPipeline) {
        console.error('❌ Pipeline not found:', pipelineId);
        return;
      }

      const existingStages = currentPipeline.stages || [];
      const existingStageIds = existingStages.map(s => s.id);
      const newStageIds = newStages.map(s => s.id);

      console.log('🔍 Existing stages:', existingStageIds);
      console.log('🔍 New stages:', newStageIds);

      // Delete removed stages
      const stagesToDelete = existingStages.filter(stage => !newStageIds.includes(stage.id));
      console.log('🗑️ Stages to delete:', stagesToDelete.length);

      for (const stage of stagesToDelete) {
        console.log('🗑️ Deleting stage:', stage.id, stage.name);
        await pipelineService.deleteStage(pipelineId, stage.id);
      }

      // Batch all update/create promises to run in parallel
      // IMPORTANT: Always update ALL existing stages to ensure order is persisted
      const stagePromises = newStages.map((stage, index) => {
        if (existingStageIds.includes(stage.id)) {
          // Always update existing stage with current position
          // This is critical for order changes to persist
          console.log(`🔄 Updating stage ${stage.id}: "${stage.name}" at position ${index}`);
          return pipelineService.updateStage(pipelineId, stage.id, {
            name: stage.name,
            order: index
          });
        } else {
          // Create new stage
          console.log(`➕ Creating new stage: "${stage.name}" at position ${index}`);
          return pipelineService.createStage(pipelineId, {
            name: stage.name,
            order: index
          });
        }
      });

      // Wait for all updates/creates to complete in parallel (much faster than sequential)
      console.log(`⏳ Executing ${stagePromises.length} stage operations in parallel...`);
      await Promise.all(stagePromises);

      console.log('✅ Successfully updated all stages for pipeline:', pipelineId);
    } catch (error) {
      console.error('❌ Error updating stages:', error);
      throw error;
    }
  };

  const handleDeletePipeline = (pipeline: Pipeline) => {
    setPipelineToDelete(pipeline);
    setShowDeleteModal(true);
  };

  const confirmDeletePipeline = async () => {
    if (!pipelineToDelete) return;

    setIsDeleting(true);
    try {
      await pipelineService.deletePipeline(pipelineToDelete.id);
      setPipelines(prev => prev.filter(pipeline => pipeline.id !== pipelineToDelete.id));
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      // TODO: Show error message to user
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPipelineToDelete(null);
    setIsDeleting(false);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingPipeline(null);
    setShowModal(true);
  };

  const openEditModal = (pipeline: Pipeline) => {
    setModalMode('edit');
    setEditingPipeline(pipeline);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPipeline(null);
  };

  if (loading) {
    return (
      <div className="bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-gray-900">Pipelines</h2>
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create new pipeline
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading pipelines...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-gray-900">Pipelines</h2>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create new pipeline
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-light text-gray-900">Pipelines</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create new pipeline
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Name</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {pipelines.length === 0 ? (
            <div className="px-6 py-8 bg-white text-center">
              <p className="text-gray-500">No pipelines created yet</p>
              <button
                onClick={openCreateModal}
                className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Create your first pipeline
              </button>
            </div>
          ) : (
            pipelines.map((pipeline) => (
              <div key={pipeline.id} className="px-6 py-4 bg-white hover:bg-gray-50 flex items-center justify-between group transition-colors">
                <span className="text-gray-900">{pipeline.name}</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(pipeline)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePipeline(pipeline)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <PipelineModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={handleSavePipeline}
        editingPipeline={editingPipeline}
        mode={modalMode}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={confirmDeletePipeline}
        pipelineName={pipelineToDelete?.name || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}