'use client';

import { ActionUnderstanding } from '../../types/actionCreation';
import { Brain, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface UnderstandingCardProps {
  understanding: ActionUnderstanding | null;
  needsMoreContext?: boolean;
  clarifyingQuestion?: string;
  isLoading?: boolean;
  className?: string;
}

export default function UnderstandingCard({ 
  understanding, 
  needsMoreContext = false,
  clarifyingQuestion,
  isLoading = false,
  className = ""
}: UnderstandingCardProps) {
  if (isLoading) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-900">Analyzing Your Request</h3>
            <p className="text-sm text-blue-700">AI is processing your input...</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="h-4 bg-blue-200 rounded animate-pulse"></div>
          <div className="h-4 bg-blue-200 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-blue-200 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!understanding) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Brain className="h-5 w-5 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-600">Our Understanding</h3>
        </div>
        <p className="text-gray-500 text-center py-4">
          Start describing your action to see our AI's understanding here.
        </p>
      </div>
    );
  }

  // Determine confidence level styling
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircle;
    if (confidence >= 0.6) return AlertCircle;
    return HelpCircle;
  };

  const ConfidenceIcon = getConfidenceIcon(understanding.confidence);
  const confidenceColor = getConfidenceColor(understanding.confidence);

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-900">Our Understanding</h3>
            <p className="text-sm text-blue-700">AI's interpretation of your action</p>
          </div>
        </div>
        
        {/* Confidence Badge */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${confidenceColor}`}>
          <ConfidenceIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {Math.round(understanding.confidence * 100)}% confident
          </span>
        </div>
      </div>

      {/* Understanding Content */}
      <div className="space-y-4">
        {/* Summary */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
          <p className="text-gray-700 bg-white rounded-lg p-3 border border-blue-100">
            {understanding.summary}
          </p>
        </div>

        {/* Behavior & Tone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Behavior</h4>
            <p className="text-gray-700 bg-white rounded-lg p-3 border border-blue-100 text-sm">
              {understanding.behavior}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Tone</h4>
            <p className="text-gray-700 bg-white rounded-lg p-3 border border-blue-100 text-sm">
              {understanding.tone}
            </p>
          </div>
        </div>

        {/* Key Points */}
        {understanding.keyPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Key Points</h4>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <ul className="space-y-1">
                {understanding.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Missing Context */}
        {understanding.missingContext && understanding.missingContext.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900 mb-1">
                  We could use more clarity on:
                </h4>
                <ul className="space-y-1">
                  {understanding.missingContext.map((context, index) => (
                    <li key={index} className="text-sm text-yellow-800">
                      • {context}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Clarifying Question */}
        {needsMoreContext && clarifyingQuestion && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-orange-900 mb-1">
                  Quick Question:
                </h4>
                <p className="text-sm text-orange-800">{clarifyingQuestion}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}