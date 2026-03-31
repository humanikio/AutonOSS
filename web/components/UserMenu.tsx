'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { User, Settings, LogOut, ChevronDown, Minus, Plus } from 'lucide-react';

interface UserMenuProps {
  isMinimized?: boolean;
}

export default function UserMenu({ isMinimized = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(isMinimized);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Paths that should auto-minimize the user menu
  const autoMinimizePaths = [
    '/agents/configuration/',
    '/training/agent/trainingCenter/',
    '/automations/automationsEditor/',
    '/integrations/nexus/details/',
    '/integrations/nexus/test/',
    '/integrations/nexus/configure/',
    '/training/knowledge/workshop/',
    '/contacts/details/',
    '/creativehub/email-templates/editor/',
    '/creativehub/content/editor/',
    '/calendar/viewer/',
    '/settings'
  ];

  // Paths that should auto-maximize the user menu (exact matches)
  const autoMaximizePaths = [
    '/agents',
    '/dashboard',
    '/training/agent',
    '/opportunities',
    '/contacts',
    '/integrations'
  ];

  // Check if current path should auto-minimize
  const shouldAutoMinimize = autoMinimizePaths.some(path => pathname?.includes(path));
  
  // Check if current path should auto-maximize (exact match only)
  const shouldAutoMaximize = autoMaximizePaths.includes(pathname || '');

  // Sync with prop changes
  useEffect(() => {
    setMinimized(isMinimized);
  }, [isMinimized]);

  // Auto-minimize/maximize based on current path
  useEffect(() => {
    if (shouldAutoMinimize) {
      setMinimized(true);
      setIsOpen(false); // Also close any open dropdown
    } else if (shouldAutoMaximize) {
      setMinimized(false);
      setIsOpen(false); // Close dropdown when maximizing
    }
  }, [shouldAutoMinimize, shouldAutoMaximize, pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleSettings = () => {
    setIsOpen(false);
    router.push('/settings');
  };

  if (!user) return null;

  // Minimized view - just a small expand button with user avatar
  if (minimized) {
    return (
      <div className="fixed top-3 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-full p-2 shadow-xl hover:bg-white/25 transition-all duration-300 hover:shadow-2xl"
          title="Expand user menu"
        >
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.name || 'User'} 
              className="w-4 h-4 rounded-full object-cover"
            />
          ) : (
            <div className="w-4 h-4 bg-primary-500/80 backdrop-blur-sm rounded-full flex items-center justify-center">
              <User className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-3 right-4 z-50" ref={menuRef}>
      {/* User Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative"
      >
        {/* Glassmorphic container */}
        <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl px-3 py-2 shadow-xl hover:bg-white/25 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center gap-2">
            {/* Minimize button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMinimized(true);
                setIsOpen(false);
              }}
              className="p-1 hover:bg-white/20 rounded-md transition-colors duration-200"
              title="Minimize user menu"
            >
              <Minus className="h-3 w-3 text-gray-600" />
            </button>
            {/* Avatar */}
            <div className="relative">
              {user.avatarUrl ? (
                <>
                  <div className="w-6 h-6 bg-white rounded-full shadow-lg">
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name || 'User'} 
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  </div>
                </>
              ) : (
                <div className="w-6 h-6 bg-primary-500/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 shadow-lg">
                  <User className="h-3 w-3 text-white" />
                </div>
              )}
              {!user.avatarUrl && (
                <div className="absolute -inset-0.5 bg-primary-400/30 rounded-full blur-sm -z-10"></div>
              )}
            </div>
            
            {/* User name */}
            <span className="text-xs font-light text-gray-900 pr-1">
              {user.name || user.email?.split('@')[0] || 'User'}
            </span>
            
            {/* Expand indicator */}
            <ChevronDown 
              className={`h-3 w-3 text-gray-600 transition-transform duration-300 ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`} 
            />
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute top-full right-0 mt-1 w-40 origin-top-right transition-all duration-300 ease-out ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Glassmorphic dropdown */}
        <div className="backdrop-blur-xl bg-white/25 border border-white/30 rounded-xl shadow-2xl overflow-hidden">
          <div className="py-1">
            {/* Settings Option */}
            <button
              onClick={handleSettings}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-white/20 transition-all duration-200 group"
            >
              <div className="relative">
                <Settings className="h-3 w-3" />
                <div className="absolute -inset-0.5 bg-gray-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
              </div>
              <span className="font-light text-xs">Settings</span>
            </button>

            {/* Divider */}
            <div className="my-0.5 border-t border-white/20"></div>

            {/* Logout Option */}
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-red-600 hover:bg-red-50/30 transition-all duration-200 group"
            >
              <div className="relative">
                <LogOut className="h-3 w-3" />
                <div className="absolute -inset-0.5 bg-red-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
              </div>
              <span className="font-light text-xs">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}