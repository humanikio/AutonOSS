'use client';

import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'error' | 'connecting';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function StatusIndicator({ 
  status, 
  size = 'md', 
  showText = true 
}: StatusIndicatorProps) {
  const configs = {
    active: {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      dotColor: 'bg-green-500',
      icon: CheckCircle,
      text: 'Active'
    },
    inactive: {
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      dotColor: 'bg-gray-400',
      icon: XCircle,
      text: 'Inactive'
    },
    error: {
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      dotColor: 'bg-red-500',
      icon: AlertCircle,
      text: 'Error'
    },
    connecting: {
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      dotColor: 'bg-yellow-500',
      icon: Clock,
      text: 'Connecting'
    }
  };

  const config = configs[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      dot: 'w-1.5 h-1.5',
      icon: 'h-3 w-3'
    },
    md: {
      container: 'px-2.5 py-1 text-xs',
      dot: 'w-2 h-2',
      icon: 'h-4 w-4'
    },
    lg: {
      container: 'px-3 py-1.5 text-sm',
      dot: 'w-2.5 h-2.5',
      icon: 'h-4 w-4'
    }
  };

  const sizeClass = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-2 rounded-full ${config.bgColor} ${config.color} ${sizeClass.container}`}>
      <div className={`${config.dotColor} ${sizeClass.dot} rounded-full ${status === 'connecting' ? 'animate-pulse' : ''}`} />
      {showText && (
        <span className="font-medium">{config.text}</span>
      )}
    </div>
  );
}