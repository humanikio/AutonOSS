'use client';

import { useParams } from 'next/navigation';
import { useState, createContext, useContext } from 'react';
import { Sidebar } from './components';

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: true,
  toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const calendarId = params?.id as string;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <SidebarContext.Provider value={{ isOpen: isSidebarOpen, toggleSidebar }}>
      <div className="flex h-screen overflow-hidden">
        {isSidebarOpen && <Sidebar calendarId={calendarId} />}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
