'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, MessageSquare, Phone, Users } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

interface Agent {
  id: string;
  name: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  totalInteractions?: number;
  botAvatarColor?: string;
  botEntityImagePath?: string;
  botIconImagePath?: string;
}

export default function AgentTraining() {
  const router = useRouter();
  const { user, tenant, isAuthenticated } = useAuth();
  
  // Agent states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllAgents, setShowAllAgents] = useState(false);

  // Set up real-time listener for agents
  useEffect(() => {
    if (!user?.uid || !tenant?.id) {
      setLoading(false);
      return;
    }

    // Create a query to get agents ordered by createdAt
    const agentsRef = collection(db, 'tenants', tenant.id, 'agents');
    const agentsQuery = query(agentsRef, orderBy('createdAt', 'desc'));

    // Set up real-time listener
    const unsubscribe = onSnapshot(agentsQuery, 
      (snapshot) => {
        const agentsData: Agent[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          agentsData.push({
            id: doc.id,
            name: data.name || 'Unnamed Agent',
            status: data.status || 'draft',
            description: data.description || 'New agent ready for configuration',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            lastActive: data.lastActive,
            totalInteractions: data.totalInteractions || 0,
            botAvatarColor: data.botAvatarColor,
            botEntityImagePath: data.botEntityImagePath,
            botIconImagePath: data.botIconImagePath,
          });
        });
        setAgents(agentsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching agents:', error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user?.uid, tenant?.id]);

  const handleStartTraining = (agentId: string) => {
    router.push(`/training/agent/trainingCenter/${agentId}`);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-48">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 rounded-full bg-black overflow-hidden mb-4">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/loading/loadingVideo.mp4" type="video/mp4" />
            </video>
          </div>
          <span className="text-gray-600 text-lg">Loading agents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900">Agent Training</h1>
          <p className="mt-2 text-gray-500">Practice conversations and test your agents</p>
        </div>

        {/* Agents List */}
        <div className="space-y-4">
          {(showAllAgents ? agents : agents.slice(0, 5)).map(agent => (
            <div
              key={agent.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    {agent.botIconImagePath ? (
                      <img 
                        src={agent.botIconImagePath} 
                        alt={`${agent.name} Bot Icon`}
                        className="h-16 w-16 object-cover rounded-full"
                      />
                    ) : (
                      <div className="p-3 bg-primary-50 rounded-full">
                        <Bot className="h-16 w-16 text-primary-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-600">{agent.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'active' ? 'bg-green-500' : 
                          agent.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        <span className={`text-xs ${
                          agent.status === 'active' ? 'text-green-700' : 
                          agent.status === 'draft' ? 'text-yellow-700' : 'text-gray-500'
                        }`}>
                          {agent.status === 'active' ? 'Active' : 
                           agent.status === 'draft' ? 'Draft' : 'Paused'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {agent.totalInteractions?.toLocaleString() || 0} interactions
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleStartTraining(agent.id)}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Start Training
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        {agents.length > 5 && (
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAllAgents(!showAllAgents)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showAllAgents ? 'View Less' : `View More (${agents.length - 5} more)`}
            </button>
          </div>
        )}

        {/* Empty State */}
        {agents.length === 0 && (
          <div className="text-center py-16">
            <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents available</h3>
            <p className="text-gray-500 mb-6">Create an agent first to start training sessions</p>
            <button
              onClick={() => router.push('/agents')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go to Agents
            </button>
          </div>
        )}
      </div>
    </div>
  );
}