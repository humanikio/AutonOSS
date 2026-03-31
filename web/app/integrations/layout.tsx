import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integrations | Pulseline',
  description: 'Manage data sources, transformations, and API integrations',
};

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="integration-layout">
      {children}
    </div>
  );
}