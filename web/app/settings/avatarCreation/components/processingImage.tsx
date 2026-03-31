'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

interface ProcessingImageProps {
  selfieData: string;
  onComplete: (generatedUrl: string) => void;
}

const processingSteps = [
  'Analyzing your selfie...',
  'Creating stylized avatar...',
  'Applying finishing touches...',
  'Almost ready!'
];

export default function ProcessingImage({ selfieData, onComplete }: ProcessingImageProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const { getToken } = useAuth();

  useEffect(() => {
    // Mock processing simulation
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < processingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1500);

    // Progress animation - fixed 20 second timer
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 100) {
          return prev + 0.5; // 100% over 20 seconds (0.5% every 100ms)
        }
        return prev;
      });
    }, 100);

    // Real API call to backend
    const timeout = setTimeout(async () => {
      try {
        // Generate avatar using backend API
        const response = await generateAvatar(selfieData);
        onComplete(response.avatarUrl);
      } catch (error) {
        console.error('Error generating avatar:', error);
        // Fall back to a placeholder image on error
        onComplete('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRTVFN0VCIiByeD0iMTAwIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzM3NEZBNiIvPgo8cGF0aCBkPSJNNjAgMTQwSDEzNFYxNTBDMTM0IDE2Ni41NjkgMTIwLjU2OSAxODAgMTA0IDE4MEg5NkM3OS40MzE1IDE4MCA2NiAxNjYuNTY5IDY2IDE1MFYxNDBINjBaIiBmaWxsPSIjMzc0RkE2Ii8+Cjwvc3ZnPgo=');
      }
    }, 20000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [selfieData, onComplete, getToken]);

  // Real API function to generate avatar
  const generateAvatar = async (imageData: string): Promise<{ avatarUrl: string }> => {
    try {
      console.log('🎨 Generating avatar with backend API...');
      
      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Call backend avatar generation endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/image-generation/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selfieData: imageData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}: Failed to generate avatar`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Avatar generation failed');
      }

      console.log('✅ Avatar generated successfully:', result.data.avatarUrl);
      return { avatarUrl: result.data.avatarUrl };
      
    } catch (error) {
      console.error('❌ Avatar generation error:', error);
      throw error;
    }
  };

  const generateMockAvatar = (): string => {
    // Generate a colorful mock avatar SVG
    const colors = ['#0794e0', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const avatarSvg = `
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="${color}" rx="100"/>
        <circle cx="100" cy="80" r="30" fill="white" fill-opacity="0.9"/>
        <path d="M60 140H134V150C134 166.569 120.569 180 104 180H96C79.4315 180 66 166.569 66 150V140H60Z" fill="white" fill-opacity="0.9"/>
        <circle cx="85" cy="75" r="3" fill="${color}"/>
        <circle cx="115" cy="75" r="3" fill="${color}"/>
        <path d="M95 90 Q100 95 105 90" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(avatarSvg)}`;
  };

  return (
    <div className="text-center space-y-6">
      {/* Processing Animation */}
      <div className="relative">
        {/* Static logo without spinning ring */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Logo container */}
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100">
            <div className="relative w-12 h-12">
              <Image
                src="/logo/auton-logo.png"
                alt="Pulseline"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 font-light">
          {processingSteps[currentStep]}
        </p>
      </div>

    </div>
  );
}