'use client';

import { useState } from 'react';
import { X, Search, Github, Star, GitFork } from 'lucide-react';

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

interface GitHubRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (repo: Repository) => void;
}

export default function GitHubRepositoryModal({
  isOpen,
  onClose,
  onSelect,
}: GitHubRepositoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock repositories - replace with actual API call
  const mockRepositories: Repository[] = [
    {
      id: '1',
      name: 'my-awesome-project',
      fullName: 'username/my-awesome-project',
      description: 'An awesome project for doing awesome things',
      stars: 245,
      forks: 32,
      language: 'TypeScript',
      isPrivate: false,
    },
    {
      id: '2',
      name: 'backend-api',
      fullName: 'username/backend-api',
      description: 'RESTful API backend service',
      stars: 156,
      forks: 18,
      language: 'Python',
      isPrivate: true,
    },
    {
      id: '3',
      name: 'frontend-app',
      fullName: 'username/frontend-app',
      description: 'Modern React application',
      stars: 89,
      forks: 12,
      language: 'JavaScript',
      isPrivate: false,
    },
  ];

  const filteredRepos = mockRepositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Github className="h-6 w-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Select Repository</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading repositories...</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-12">
              <Github className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No repositories found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    onSelect(repo);
                    onClose();
                  }}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                          {repo.name}
                        </h3>
                        {repo.isPrivate && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{repo.fullName}</p>
                      {repo.description && (
                        <p className="text-sm text-gray-500 mb-3">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>{repo.stars}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          <span>{repo.forks}</span>
                        </div>
                        {repo.language && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span>{repo.language}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
