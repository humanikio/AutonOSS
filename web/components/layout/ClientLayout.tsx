'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { setTokenGetter } from '@/lib/api/client';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { isAuthenticated, loading, getToken, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Set the token getter for API client
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Check if current route is an auth route or loading page
  const isAuthRoute = pathname?.startsWith('/login') || pathname?.startsWith('/signup');
  const isLoadingPage = pathname === '/';
  
  // Check if current route is an invitation page (full-screen layout)
  const isInviteRoute = pathname?.startsWith('/invite/');
  
  // Check if current route is a workshop page (full-screen layout)
  const isWorkshopRoute = pathname?.includes('/training/knowledge/workshop/');

  // Check if current route is an agent configuration page (full-screen layout)
  const isAgentConfigRoute = pathname?.includes('/agents/configuration/');

  // Check if current route is an automations editor page (full-screen layout)
  const isAutomationsEditorRoute = pathname?.includes('/automations/automationsEditor/');
  
  // Check if current route is a training session page (full-screen layout)
  const isTrainingSessionRoute = pathname?.includes('/training/agent/trainingCenter/') && pathname?.includes('/training-session/');
  
  // Check if current route is an action detail page (full-screen layout)
  const isActionDetailRoute = pathname?.includes('/training/agent/trainingCenter/') && pathname?.includes('/actions/') && !pathname?.endsWith('/actions');
  
  // Check if current route is an email templates editor page (full-screen layout)
  const isEmailTemplatesEditorRoute = pathname?.includes('/creativehub/email-templates/editor/');

  // Check if current route is a content editor page (full-screen layout)
  const isContentEditorRoute = pathname?.includes('/creativehub/content/editor/');

  // Check if current route is a calendar viewer page (full-screen layout)
  const isCalendarViewerRoute = pathname?.includes('/calendar/viewer/');

  // Check if current route is a workspace manage page (full-screen layout, no sidebar)
  const isWorkspaceManageRoute = pathname?.startsWith('/workspaces/manage/');

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-24 h-24 rounded-full bg-black overflow-hidden mx-auto">
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
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth pages and loading page layout (login/signup/loading/invite)
  if (isAuthRoute || isLoadingPage || isInviteRoute) {
    return <>{children}</>;
  }

  // Workshop pages layout (full-screen, no sidebar)
  if (isWorkshopRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Agent configuration pages layout (full-screen, no sidebar)
  if (isAgentConfigRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Automations editor pages layout (full-screen, no sidebar)
  if (isAutomationsEditorRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Training session pages layout (full-screen, no sidebar)
  if (isTrainingSessionRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Action detail pages layout (full-screen, no sidebar)
  if (isActionDetailRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Email templates editor pages layout (full-screen, no sidebar)
  if (isEmailTemplatesEditorRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Content editor pages layout (full-screen, no sidebar)
  if (isContentEditorRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Calendar viewer pages layout (full-screen, no sidebar)
  if (isCalendarViewerRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Workspace manage pages layout (full-screen, no sidebar)
  if (isWorkspaceManageRoute && isAuthenticated) {
    return <>{children}</>;
  }

  // Authenticated app layout with sidebar
  if (isAuthenticated) {
    return (
      <div className="flex h-screen bg-gray-50">
        <MobileHeader isMenuOpen={isMobileMenuOpen} toggleMenu={toggleMobileMenu} />
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <main className="flex-1 overflow-y-auto lg:ml-0 pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    );
  }
  
  // Unauthenticated — render children (individual pages handle their own auth needs)
  return <>{children}</>;
}