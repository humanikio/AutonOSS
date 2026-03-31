'use client';

import { useParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useSidebar } from '../layout';
import GitHubConnect from '@/components/github/GitHubConnect';

export default function TasksProjectsPage() {
  const params = useParams();
  const calendarId = params?.id as string;
  const { toggleSidebar } = useSidebar();

  const handleRepositorySelect = (repo: any) => {
    console.log('Selected repository:', repo);
    // TODO: Handle repository selection (save to backend, etc.)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Background */}
      <div className="fixed inset-0 bg-gray-50 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-cyan-50/15 to-blue-50/10"></div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-96 -right-96 w-[1000px] h-[1000px] bg-gradient-to-br from-blue-200/35 to-cyan-300/25 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-96 -left-96 w-[900px] h-[900px] bg-gradient-to-tr from-cyan-200/30 to-blue-300/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header with Menu Button */}
        <div className="backdrop-blur-xl bg-white/70 border-b border-white/50 px-6 py-4 shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-2xl font-light text-gray-900">Tasks & Projects</h1>
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* GitHub Repository Connection */}
            <GitHubConnect onRepositorySelect={handleRepositorySelect} />

            {/* Tasks & Projects Section */}
            <div className="backdrop-blur-xl bg-white/70 border border-white/50 rounded-2xl p-8 shadow-xl">
              <p className="text-gray-600 mb-6">
                Manage your tasks and projects for calendar: {calendarId}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="backdrop-blur-lg bg-white/50 border border-white/60 rounded-xl p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-3">Tasks</h2>
                  <p className="text-gray-500 text-sm">Task management coming soon...</p>
                </div>

                <div className="backdrop-blur-lg bg-white/50 border border-white/60 rounded-xl p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-3">Projects</h2>
                  <p className="text-gray-500 text-sm">Project management coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
