'use client';

import { Activity, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MonitoringPage() {
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
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <Activity className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-light text-gray-900 mb-4">Integration Monitoring</h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Real-time monitoring, health checks, and performance analytics for your integrations. 
            Track uptime, identify bottlenecks, and get alerts when something needs attention.
          </p>

          <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-4xl mx-auto">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Coming Soon Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Real-time Health Dashboard</h3>
                <p className="text-sm text-gray-500">Monitor system health, uptime, and performance metrics in real-time.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Error Tracking & Alerting</h3>
                <p className="text-sm text-gray-500">Get notified of issues and track error patterns across integrations.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Performance Analytics</h3>
                <p className="text-sm text-gray-500">Analyze response times, throughput, and resource utilization.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Custom Dashboards</h3>
                <p className="text-sm text-gray-500">Create custom monitoring views for different teams and use cases.</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Expected: Q2 2024
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}