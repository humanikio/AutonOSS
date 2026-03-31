'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export default function LoadingPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    const redirectTimer = setTimeout(() => {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }, 2500);

    return () => clearTimeout(redirectTimer);
  }, [router, isAuthenticated, authLoading]);

  return (
    <>
      <style jsx global>{`
        @keyframes fadeGlow {
          0%, 100% {
            opacity: 0.7;
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.15));
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.25)) drop-shadow(0 0 40px rgba(59, 130, 246, 0.15));
          }
        }
        
        .fade-glow-animation {
          animation: fadeGlow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="fade-glow-animation">
          <Image
            src="/logo/auton-logo.png"
            alt="Pulseline Logo"
            width={200}
            height={80}
            priority
          />
        </div>
      </div>
    </>
  );
}