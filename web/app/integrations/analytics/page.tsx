'use client';

import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link 
            href="/integrations"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Integration Center
          </Link>
        </div>

        {/* Coming Soon Content */}
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <BarChart3 className="h-12 w-12 text-orange-600" />
          </div>
          
          <h1 className="text-3xl font-light text-gray-900 mb-4">Integration Analytics</h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Deep insights into your data flows, usage patterns, and integration efficiency. 
            Make data-driven decisions about your integration strategy.
          </p>

          <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-4xl mx-auto">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Coming Soon Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Data Flow Visualization</h3>
                <p className="text-sm text-gray-500">Interactive diagrams showing how data moves through your systems.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Usage Analytics</h3>
                <p className="text-sm text-gray-500">Track API calls, data volume, and integration utilization over time.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Cost Analysis</h3>
                <p className="text-sm text-gray-500">Monitor integration costs and optimize resource allocation.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Performance Insights</h3>
                <p className="text-sm text-gray-500">Identify bottlenecks and optimization opportunities.</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <span className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              Expected: Q3 2024
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}