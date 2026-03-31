'use client';

import { useState } from 'react';
import { Github, Plus } from 'lucide-react';
import GitHubRepositoryModal from './GitHubRepositoryModal';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  isPrivate: boolean;
}

interface GitHubConnectProps {
  onRepositorySelect?: (repo: Repository) => void;
}

export default function GitHubConnect({ onRepositorySelect }: GitHubConnectProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const handleSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    if (onRepositorySelect) {
      onRepositorySelect(repo);
    }
  };

  return (
    <>
      <div className="backdrop-blur-xl bg-white/70 border border-white/50 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Connect GitHub Repository
            </h3>
            <p className="text-sm text-gray-600">
              Connect a repository for use in container
            </p>
          </div>
        </div>

        {selectedRepo ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Github className="h-5 w-5 text-gray-700 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedRepo.name}</h4>
                  <p className="text-sm text-gray-600">{selectedRepo.fullName}</p>
                  {selectedRepo.description && (
                    <p className="text-sm text-gray-500 mt-1">{selectedRepo.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg transition-colors">
                <Github className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-gray-900 group-hover:text-blue-600">
                  Connect GitHub
                </p>
                <p className="text-sm text-gray-500">
                  Browse and select your repositories
                </p>
              </div>
              <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
            </button>

            {/* Placeholder for future integrations */}
            <div className="text-center py-2">
              <p className="text-xs text-gray-400">More integrations coming soon...</p>
            </div>
          </div>
        )}
      </div>

      <GitHubRepositoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleSelect}
      />
    </>
  );
}
