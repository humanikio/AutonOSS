'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Loader2 } from 'lucide-react';
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

export default function AgentWorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;
  const router = useRouter();
  const { user, tenant } = useAuth();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Set up real-time listener for agents
  useEffect(() => {
    if (!user?.uid || !tenant?.id) {
      setLoading(false);
      return;
    }

    const agentsRef = collection(db, 'tenants', tenant.id, 'agents');
    const agentsQuery = query(agentsRef, orderBy('createdAt', 'desc'));

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

    return () => unsubscribe();
  }, [user?.uid, tenant?.id]);

  const handleSelectAgent = (agentId: string) => {
    router.push(`/workspaces/manage/${workspaceId}/agentWorkshop/agentEditor/${agentId}`);
  };

  if (loading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Agent Workshop</h1>
          <p className="mt-1 text-sm text-gray-600">
            Select an agent to configure and add to your workspace
          </p>
        </div>

        {/* Agents Grid */}
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent.id)}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-primary-600 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {agent.botIconImagePath ? (
                      <img
                        src={agent.botIconImagePath}
                        alt={`${agent.name} Bot Icon`}
                        className="h-12 w-12 object-cover rounded-full"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Bot className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {agent.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {agent.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' :
                        agent.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-500 capitalize">
                        {agent.status}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
            <p className="text-gray-500 mb-6">Create agents from the Agents page</p>
          </div>
        )}
      </div>
    </div>
  );
}
