import { Bot, MoreVertical, Power } from 'lucide-react';

interface AgentCardProps {
  name: string;
  description: string;
  type: 'SMS' | 'Call';
  status: 'active' | 'inactive' | 'training';
  metrics: {
    conversations?: number;
    successRate?: number;
    avgResponseTime?: string;
    callMinutes?: number;
    appointments?: number;
  };
}

const AgentCard = ({ name, description, type, status, metrics }: AgentCardProps) => {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    training: 'bg-yellow-100 text-yellow-700'
  };

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Bot className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded">
          <MoreVertical className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
          {status === 'active' && <Power className="h-3 w-3 inline mr-1" />}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          type === 'SMS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {type}
        </span>
      </div>

      <div className="space-y-2">
        {type === 'SMS' ? (
          <>
            {metrics.conversations && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Conversations</span>
                <span className="font-medium text-gray-900">{metrics.conversations}</span>
              </div>
            )}
            {metrics.successRate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Success Rate</span>
                <span className="font-medium text-gray-900">{metrics.successRate}%</span>
              </div>
            )}
            {metrics.avgResponseTime && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg Response</span>
                <span className="font-medium text-gray-900">{metrics.avgResponseTime}</span>
              </div>
            )}
          </>
        ) : (
          <>
            {metrics.callMinutes && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Call Minutes</span>
                <span className="font-medium text-gray-900">{metrics.callMinutes}</span>
              </div>
            )}
            {metrics.appointments && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Appointments</span>
                <span className="font-medium text-gray-900">{metrics.appointments}</span>
              </div>
            )}
            {metrics.successRate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Success Rate</span>
                <span className="font-medium text-gray-900">{metrics.successRate}%</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
        <button className="flex-1 text-sm py-1.5 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          View Details
        </button>
        <button className="flex-1 text-sm py-1.5 px-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
          Train
        </button>
      </div>
    </div>
  );
};

export default AgentCard;