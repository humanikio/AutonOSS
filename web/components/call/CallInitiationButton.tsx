'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePhoneCapableAgents } from '@/hooks/useAgentData';
import { FirestoreAgent } from '@/lib/services/agentService';
import { CallService } from '@/lib/services/callService';
import AgentSelectionModal from './AgentSelectionModal';

interface CallInitiationButtonProps {
  contactId?: string;
  contactPhone?: string;
  tenantId?: string;
  onCallStarted?: (callData: any) => void;
  disabled?: boolean;
  className?: string;
}

type CallState = 'idle' | 'selecting-agent' | 'initiating' | 'completed' | 'error';

export default function CallInitiationButton({
  contactId,
  contactPhone,
  tenantId,
  onCallStarted,
  disabled = false,
  className = "p-2 hover:bg-gray-100 rounded-lg"
}: CallInitiationButtonProps) {
  const { getToken } = useAuth();
  const [callState, setCallState] = useState<CallState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Get phone-capable agents
  const {
    phoneAgents,
    loading: agentsLoading,
    error: agentsError
  } = usePhoneCapableAgents(tenantId || '');

  const handleCallButtonClick = () => {
    if (!tenantId) {
      setError('No tenant ID available');
      setCallState('error');
      return;
    }

    if (!contactId && !contactPhone) {
      setError('Contact information not available');
      setCallState('error');
      return;
    }

    if (!contactPhone) {
      setError('Contact has no phone number');
      setCallState('error');
      return;
    }

    if (agentsError) {
      setError(agentsError);
      setCallState('error');
      return;
    }

    if (phoneAgents.length === 0) {
      setError('No agents are available for phone calls. Please ensure at least one agent has phone capabilities enabled.');
      setCallState('error');
      return;
    }

    setError(null);
    setCallState('selecting-agent');
  };

  const handleAgentSelected = async (agent: FirestoreAgent) => {
    try {
      setCallState('initiating');
      setError(null);

      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Start the call
      const result = await CallService.startAgentCall({
        tenantId: tenantId!,
        agentId: agent.id,
        contactId,
        targetPhoneNumber: contactPhone
      }, token);

      if (result.success) {
        setCallState('completed');
        
        // Notify parent component
        if (onCallStarted) {
          onCallStarted(result.data);
        }

        // Auto-close modal after success
        setTimeout(() => {
          setCallState('idle');
        }, 1500);
      } else {
        throw new Error(result.error || 'Failed to start call');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      setError(error instanceof Error ? error.message : 'Failed to start call');
      setCallState('error');
    }
  };

  const handleCloseModal = () => {
    setCallState('idle');
    setError(null);
  };

  const isDisabled = disabled || callState === 'initiating';

  return (
    <>
      <button 
        onClick={handleCallButtonClick}
        disabled={isDisabled}
        className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={
          !contactPhone 
            ? 'Contact has no phone number'
            : phoneAgents.length === 0 
              ? 'No agents available for calls'
              : 'Start phone call'
        }
      >
        <Phone className="h-4 w-4 text-gray-400" />
      </button>

      {/* Agent Selection Modal */}
      <AgentSelectionModal
        isOpen={callState === 'selecting-agent' || callState === 'initiating' || callState === 'completed' || callState === 'error'}
        onClose={handleCloseModal}
        agents={phoneAgents}
        onSelectAgent={handleAgentSelected}
        loading={agentsLoading || callState === 'initiating'}
      />

      {/* Success/Error State in Modal */}
      {(callState === 'completed' || callState === 'error') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="bg-white rounded-lg max-w-sm w-full mx-4 p-6 text-center" onClick={(e) => e.stopPropagation()}>
            {callState === 'completed' ? (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Call Started!</h3>
                <p className="text-gray-600 mb-4">The agent call has been initiated successfully.</p>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  OK
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Call Failed</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCallState('selecting-agent');
                      setError(null);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}