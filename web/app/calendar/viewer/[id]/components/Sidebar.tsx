'use client';

import { Calendar, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  calendarId: string;
}

export default function Sidebar({ calendarId }: SidebarProps) {
  const pathname = usePathname();

  const isCalendarActive = pathname === `/calendar/viewer/${calendarId}`;
  const isTasksActive = pathname === `/calendar/viewer/${calendarId}/tasks`;

  const menuItems = [
    {
      icon: Calendar,
      label: 'Calendar',
      href: `/calendar/viewer/${calendarId}`,
      active: isCalendarActive
    },
    {
      icon: ListTodo,
      label: 'Tasks & Projects',
      href: `/calendar/viewer/${calendarId}/tasks`,
      active: isTasksActive
    }
  ];

  return (
    <div className="w-48 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="px-3 py-3 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Navigation</h2>
      </div>

      <nav className="flex-1 px-2 py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2 py-2 rounded-md mb-0.5 transition-all text-sm ${
                item.active
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
