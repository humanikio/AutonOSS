'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Grid3x3, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SideConfigMenuProps {
  workspaceId: string;
}

export default function SideConfigMenu({ workspaceId }: SideConfigMenuProps) {
  const pathname = usePathname();

  // Auto-collapse when on agent editor page
  const isAgentEditorPage = pathname?.includes('/agentEditor/');
  const [isCollapsed, setIsCollapsed] = useState(isAgentEditorPage);

  // Update collapsed state when navigating to/from agent editor
  useEffect(() => {
    if (isAgentEditorPage) {
      setIsCollapsed(true);
    }
  }, [isAgentEditorPage]);

  const menuItems = [
    {
      id: 'grid',
      label: 'Grid',
      icon: Grid3x3,
      href: `/workspaces/manage/${workspaceId}`,
    },
    {
      id: 'agents',
      label: 'Agent Workshop',
      icon: Users,
      href: `/workspaces/manage/${workspaceId}/agentWorkshop`,
    },
  ];

  const isActive = (href: string) => {
    if (href === `/workspaces/manage/${workspaceId}`) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div
      className={`h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-gray-900">Workspace Menu</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors ml-auto"
          title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
