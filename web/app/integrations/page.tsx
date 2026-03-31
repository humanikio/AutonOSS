'use client';

import { 
  Database, 
  GitBranch, 
  Activity, 
  BarChart3,
  ArrowRight,
  Zap
} from 'lucide-react';
import Link from 'next/link';

export default function IntegrationsPage() {

  const integrationModules = [
    {
      id: 'data-sources',
      name: 'Data Sources',
      description: 'Connect and manage external data sources',
      icon: Database,
      href: '/integrations/data-sources',
      stats: { connected: 3, active: 2, total_records: '24.2k' },
      color: 'bg-blue-500',
      status: 'active'
    },
    {
      id: 'nexus',
      name: 'Nexus (UDL)',
      description: 'Universal Data Layer - Map and transform data between sources',
      icon: GitBranch,
      href: '/integrations/nexus',
      stats: { mappings: 12, endpoints: 8, transformations: 5 },
      color: 'bg-purple-500',
      status: 'active',
      featured: true
    },
    {
      id: 'monitoring',
      name: 'Monitoring',
      description: 'Track integration health and performance',
      icon: Activity,
      href: '/integrations/monitoring',
      stats: { uptime: '99.9%', errors: 2, latency: '120ms' },
      color: 'bg-green-500',
      status: 'coming_soon'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Integration insights and data flow analysis',
      icon: BarChart3,
      href: '/integrations/analytics',
      stats: { flows: 15, volume: '1.2M', efficiency: '94%' },
      color: 'bg-orange-500',
      status: 'coming_soon'
    }
  ];

  const quickActions = [
    {
      name: 'Configure Data Mapping',
      description: 'Create field mappings and transformations in Nexus UDL',
      href: '/integrations/nexus/configure',
      icon: GitBranch,
      color: 'bg-purple-500'
    },
    {
      name: 'Test API Endpoints',
      description: 'Test and validate your unified API endpoints',
      href: '/integrations/nexus/test',
      icon: Zap,
      color: 'bg-green-500'
    },
    {
      name: 'Monitor Data Sources',
      description: 'View activity and performance details',
      href: '/integrations/nexus/details',
      icon: Activity,
      color: 'bg-blue-500'
    }
  ];

  return (
    <>
      {/* Full-screen background that goes behind everything */}
      <div className="fixed inset-0 bg-gray-50 pointer-events-none">
        {/* Full-width blue background base */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-100/20 via-blue-50/15 to-primary-50/10"></div>
        
        {/* Glassmorphic background elements - Full coverage */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Corner coverage */}
          <div className="absolute -top-96 -right-96 w-[1000px] h-[1000px] bg-gradient-to-br from-primary-200/35 to-blue-300/25 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-96 -left-96 w-[900px] h-[900px] bg-gradient-to-tr from-blue-200/30 to-primary-300/20 rounded-full blur-3xl"></div>
          <div className="absolute -top-96 -left-96 w-[800px] h-[800px] bg-gradient-to-bl from-primary-100/25 to-blue-200/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-96 -right-96 w-[850px] h-[850px] bg-gradient-to-tl from-blue-300/30 to-primary-200/25 rounded-full blur-3xl"></div>
          
          {/* Edge coverage */}
          <div className="absolute top-0 -right-[600px] w-[1200px] h-[700px] bg-gradient-to-l from-primary-200/20 to-blue-100/15 rounded-full blur-3xl"></div>
          <div className="absolute top-0 -left-[600px] w-[1200px] h-[600px] bg-gradient-to-r from-blue-200/20 to-primary-100/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-[600px] w-[1200px] h-[600px] bg-gradient-to-l from-blue-300/25 to-primary-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -left-[600px] w-[1200px] h-[650px] bg-gradient-to-r from-primary-200/25 to-blue-200/20 rounded-full blur-3xl"></div>
          
          {/* Center coverage */}
          <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-gradient-to-br from-primary-100/20 to-blue-200/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-blue-100/15 to-primary-100/20 rounded-full blur-3xl"></div>
        </div>
      </div>
      
      {/* Content that respects sidebar layout */}
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extralight text-gray-900 mb-3">Integrations</h1>
          <p className="text-gray-600 text-lg font-light max-w-md mx-auto">
            Connect your data ecosystem
          </p>
        </div>

        {/* Featured: Nexus UDL */}
        <div className="mb-16">
          <div className="relative group">
            {/* Glass card with white background compatibility */}
            <div className="relative backdrop-blur-xl bg-white/70 border border-white/60 rounded-3xl p-8 shadow-2xl hover:bg-white/80 transition-all duration-500 hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {/* Icon glass container */}
                    <div className="backdrop-blur-lg bg-primary-50/80 border border-primary-100/60 rounded-2xl p-4 shadow-lg">
                      <GitBranch className="h-10 w-10 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-light text-gray-900 mb-2">Nexus UDL</h2>
                    <p className="text-gray-600 font-light text-lg mb-4">Universal data transformation layer</p>
                    <div className="flex items-center gap-8 text-sm text-gray-500">
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full shadow-sm"></div>
                        12 Mappings
                      </span>
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full shadow-sm"></div>
                        8 Endpoints
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/integrations/nexus"
                  className="group/button relative"
                >
                  {/* Button glass effect */}
                  <div className="backdrop-blur-lg bg-primary-500/90 hover:bg-primary-600/90 border border-primary-400/50 text-white px-8 py-4 rounded-xl font-light transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl">
                    <span>Open</span>
                    <ArrowRight className="h-4 w-4 group-hover/button:translate-x-1 transition-transform duration-300" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="group relative"
              >
                {/* Glass card with white background compatibility */}
                <div className="backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl p-6 hover:bg-white/75 transition-all duration-500 shadow-xl hover:shadow-2xl hover:shadow-primary-200/20">
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon glass container */}
                    <div className="backdrop-blur-lg bg-primary-50/70 border border-primary-100/50 rounded-xl p-3 shadow-lg">
                      <action.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-600 font-light leading-relaxed">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Integration Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {integrationModules.map((module) => (
            <div key={module.id} className="group relative">
              {/* Glass card with white background compatibility */}
              <div className={`backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl p-8 hover:bg-white/75 transition-all duration-500 shadow-xl hover:shadow-2xl hover:shadow-primary-200/20 ${
                module.featured ? 'ring-1 ring-primary-200/50' : ''
              }`}>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {/* Icon glass container */}
                    <div className={`backdrop-blur-lg bg-primary-50/70 border border-primary-100/50 rounded-xl p-3 shadow-lg`}>
                      <module.icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-light text-gray-900">{module.name}</h3>
                        {module.status === 'coming_soon' && (
                          <span className="backdrop-blur-lg bg-yellow-100/80 border border-yellow-200/60 text-yellow-700 px-3 py-1 text-xs rounded-full font-light">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-light">{module.description}</p>
                    </div>
                  </div>
                </div>

                {/* Module Stats */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  {Object.entries(module.stats).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-2xl font-light text-primary-600 mb-1">{value}</div>
                      <div className="text-xs text-gray-500 font-light capitalize">
                        {key.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  {module.status === 'active' ? (
                    <Link
                      href={module.href}
                      className="group/btn relative"
                    >
                      {/* Button glass effect */}
                      <div className={`backdrop-blur-lg ${
                        module.featured 
                          ? 'bg-primary-500/90 hover:bg-primary-600/90 text-white'
                          : 'bg-white/70 hover:bg-white/85 text-gray-700'
                      } border border-primary-200/50 px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-light`}>
                        <span>Open</span>
                        <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </div>
                    </Link>
                  ) : (
                    <div className="backdrop-blur-lg bg-gray-100/70 border border-gray-200/50 text-gray-400 px-6 py-3 rounded-xl font-light">
                      Coming Soon
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Overview */}
        <div className="relative group">
          {/* Glass card with white background compatibility */}
          <div className="backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:bg-white/75 hover:shadow-primary-200/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center group">
                <div className="text-3xl font-extralight text-primary-600 mb-2">3</div>
                <div className="text-sm text-gray-600 font-light">Sources</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-extralight text-blue-600 mb-2">12</div>
                <div className="text-sm text-gray-600 font-light">Mappings</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-extralight text-green-600 mb-2">24.2k</div>
                <div className="text-sm text-gray-600 font-light">Records</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-extralight text-emerald-600 mb-2">99.9%</div>
                <div className="text-sm text-gray-600 font-light">Uptime</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}