'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CRM() {
  const router = useRouter();

  useEffect(() => {
    router.push('/crm/conversations');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-48">
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 rounded-full bg-black overflow-hidden mb-4">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/loading/loadingVideo.mp4" type="video/mp4" />
          </video>
        </div>
        <span className="text-gray-600 text-lg">Redirecting to conversations...</span>
      </div>
    </div>
  );
}