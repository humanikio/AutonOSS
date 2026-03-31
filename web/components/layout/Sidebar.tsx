'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  GraduationCap,
  MessageSquare,
  Users,
  Settings,
  ChevronDown,
  Workflow,
  Database,
  Zap,
  Palette,
  Calendar,
  Folder
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TenantSwitcher from '@/components/TenantSwitcher';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen = true, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { tenant } = useAuth();

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const closeAllSections = () => {
    setExpandedSection(null);
  };

  // Auto-expand section if current page is within that category
  useEffect(() => {
    if (pathname.startsWith('/training')) {
      setExpandedSection('training');
    } else if (pathname.startsWith('/crm')) {
      setExpandedSection('crm');
    } else {
      setExpandedSection(null);
    }
  }, [pathname]);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: pathname === '/dashboard'
    },
    {
      name: 'Agents',
      href: '/agents',
      icon: Bot,
      current: pathname.startsWith('/agents')
    },
    {
      name: 'Training',
      icon: GraduationCap,
      current: pathname.startsWith('/training'),
      expandable: true,
      expanded: expandedSection === 'training',
      children: [
        { name: 'Knowledge Hub', href: '/training/knowledge', current: pathname === '/training/knowledge' },
        { name: 'Agent Training', href: '/training/agent', current: pathname === '/training/agent' }
      ]
    },
    {
      name: 'Conversations',
      href: '/crm/conversations',
      icon: MessageSquare,
      current: pathname.startsWith('/crm/conversations')
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: Calendar,
      current: pathname.startsWith('/calendar')
    },
    {
      name: 'Opportunities',
      href: '/opportunities',
      icon: Workflow,
      current: pathname.startsWith('/opportunities')
    },
    {
      name: 'Workspaces',
      href: '/workspaces',
      icon: Folder,
      current: pathname.startsWith('/workspaces')
    },
    {
      name: 'Automations',
      href: '/automations',
      icon: Zap,
      current: pathname.startsWith('/automations')
    },
    {
      name: 'Creative Hub',
      href: '/creativehub',
      icon: Palette,
      current: pathname.startsWith('/creativehub')
    },
    {
      name: 'Contacts',
      href: '/contacts',
      icon: Users,
      current: pathname === '/contacts'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: pathname === '/settings'
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
      <div className="flex h-auto flex-col px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <Image
            src="/logo/auton-logo.png"
            alt="Auton Logo"
            width={80}
            height={80}
            className="rounded"
          />
          <h1 className="text-2xl font-bold gradient-text">Auton</h1>
        </div>
        <TenantSwitcher />
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.expandable ? (
              <>
                <button
                  onClick={() => toggleSection(item.name.toLowerCase())}
                  className={`w-full sidebar-item ${item.current ? 'sidebar-item-active' : ''} group`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      item.expanded ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    item.expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="ml-8 mt-1 space-y-1 pb-1">
                    {item.children?.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        onClick={() => {
                          closeAllSections();
                          onClose?.();
                        }}
                        className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                          child.current
                            ? 'bg-primary-50 text-primary-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Link
                href={item.href || '#'}
                onClick={() => {
                  closeAllSections();
                  onClose?.();
                }}
                className={`sidebar-item ${item.current ? 'sidebar-item-active' : ''}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {(item as any).badge && (
                  <span className="bg-primary-100 text-primary-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
    </>
  );
};

export default Sidebar;