'use client';

import { ConfigurationSectionProps } from '../../types';

export default function OverviewSection({ agentId, config, onUpdate }: ConfigurationSectionProps) {
  const handleNameChange = (name: string) => {
    onUpdate({ name });
  };

  const handleDescriptionChange = (description: string) => {
    onUpdate({ description });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Agent Overview</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Agent Name
        </label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={config.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}