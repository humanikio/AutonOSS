'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Image as ImageIcon,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  ArrowLeft,
  Loader2,
  Sparkles,
  Grid3x3
} from 'lucide-react';
import Link from 'next/link';

interface ContentSession {
  id: string;
  name: string;
  prompt?: string;
  imageCount: number;
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export default function ContentStudioPage() {
  const router = useRouter();
  const { user, currentTenantId, getToken } = useAuth();
  const [sessions, setSessions] = useState<ContentSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<ContentSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load sessions
  useEffect(() => {
    if (user && currentTenantId) {
      loadSessions();
    }
  }, [user, currentTenantId]);

  const loadSessions = async () => {
    if (!user || !currentTenantId) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/content-sessions?tenantId=${currentTenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        console.error('Failed to load sessions');
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!user || !currentTenantId) return;

    setIsCreating(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/content-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          name: 'Untitled Session',
          prompt: ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to editor with new session ID
        router.push(`/creativehub/content/editor/${data.session.id}`);
      } else {
        console.error('Failed to create session');
        alert('Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete || !currentTenantId) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/content-sessions/${sessionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId
        })
      });

      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
        setSessionToDelete(null);
      } else {
        console.error('Failed to delete session');
        alert('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.prompt && session.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 bg-gray-50 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-100/20 via-cyan-50/15 to-primary-50/10"></div>
      </div>

      <div className="relative min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/creativehub"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Creative Hub</span>
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light text-gray-900">Content Studio</h1>
                <p className="mt-2 text-gray-500">Create AI-generated images and visual content for your campaigns</p>
              </div>
              <button
                onClick={handleCreateSession}
                disabled={isCreating}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>New Session</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions by name or prompt..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-600">Loading sessions...</span>
            </div>
          ) : (
            <>
              {/* Sessions Grid */}
              {filteredSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className="group relative backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl overflow-hidden hover:bg-white/80 transition-all duration-300 hover:shadow-xl"
                    >
                      {/* Thumbnail/Preview Area */}
                      <div className="aspect-video bg-gradient-to-br from-cyan-100 to-blue-100 relative overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-16 w-16 text-primary-300" />
                        </div>
                        {/* Overlay with quick actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/creativehub/content/editor/${session.id}`)}
                            className="p-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit session"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setSessionToDelete(session)}
                            className="p-3 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete session"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate mb-1">{session.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                              session.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                        </div>

                        {session.prompt && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            "{session.prompt}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Grid3x3 className="h-3.5 w-3.5" />
                            {session.imageCount} images
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            Updated: {new Date(session.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* Click to edit */}
                      <button
                        onClick={() => router.push(`/creativehub/content/editor/${session.id}`)}
                        className="absolute inset-0 w-full h-full opacity-0"
                        aria-label="Edit session"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl">
                  <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'No sessions found' : 'No content sessions yet'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleCreateSession}
                      disabled={isCreating}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Create your first session
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Session</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{sessionToDelete.name}"? This will delete all generated images in this session. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
