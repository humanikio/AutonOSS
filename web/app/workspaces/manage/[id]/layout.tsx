'use client';

import { use } from 'react';
import SideConfigMenu from './components/SideConfigMenu';

export default function WorkspaceManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  return (
    <div className="h-screen flex overflow-hidden">
      <SideConfigMenu workspaceId={workspaceId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
