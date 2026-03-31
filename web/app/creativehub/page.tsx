'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Sparkles,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// Preview components for each module
function EmailPreview() {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden">
      <img
        src="/85e33d2a-0817-483b-ad38-21969dd042f0.png"
        alt="Email template preview"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function ContentStudioPreview() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const previewImages = [
    '/creativeHubPreviewImages/3189f600-9029-40c2-87ac-1dc9c2017cfd.png',
    '/creativeHubPreviewImages/64a0edae-e81c-4559-b903-75c247cdbae2.png',
    '/creativeHubPreviewImages/6537219d-49b6-41fe-9a13-915afa3246b6.png',
    '/creativeHubPreviewImages/ee50db52-169e-46e0-90ca-8d6865014a51.png'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % previewImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [previewImages.length]);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden">
      {/* Full image slideshow */}
      {previewImages.map((imgSrc, idx) => (
        <div
          key={imgSrc}
          className={`absolute inset-0 transition-opacity duration-700 ${
            idx === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={imgSrc}
            alt={`Content studio preview ${idx + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      {/* Sparkle overlay effect */}
      <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1.5 shadow-lg">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      {/* Slide indicators */}
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
        {previewImages.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === currentSlide ? 'w-6 bg-purple-600' : 'w-1.5 bg-purple-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

interface LibraryImage {
  id: string;
  url: string;
  fileName: string;
  createdAt: string;
}

function ImageLibraryPreview() {
  const { currentTenantId, getToken } = useAuth();
  const [recentImages, setRecentImages] = useState<LibraryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);

  // Fetch recent images
  useEffect(() => {
    const fetchRecentImages = async () => {
      if (!currentTenantId) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const response = await fetch(`/api/image-library?tenantId=${currentTenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const images = data.images || [];

          // Sort by createdAt (newest first) and take the 6 most recent
          const sortedImages = images
            .sort((a: LibraryImage, b: LibraryImage) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 6);

          setRecentImages(sortedImages);
        }
      } catch (error) {
        console.error('Error loading recent images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentImages();
  }, [currentTenantId, getToken]);

  // Slideshow effect
  useEffect(() => {
    if (recentImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentImage((prev) => (prev + 1) % recentImages.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [recentImages.length]);

  // Loading state
  if (isLoading) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Empty state
  if (recentImages.length === 0) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="h-10 w-10 text-cyan-400 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-cyan-700 font-light">No images yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg p-3 overflow-hidden">
      {/* Image grid layout */}
      <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full">
        {recentImages.map((img, idx) => (
          <div
            key={img.id}
            className={`rounded-md overflow-hidden transition-all duration-500 ${
              idx === currentImage ? 'ring-2 ring-cyan-500 scale-105' : 'opacity-70'
            }`}
          >
            <img
              src={img.url}
              alt={img.fileName}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreativeHubPage() {

  const hubModules = [
    {
      id: 'email-templates',
      name: 'Email Templates',
      tagline: 'Design & send beautiful emails',
      icon: Mail,
      href: '/creativehub/email-templates',
      color: 'from-blue-500 to-indigo-600',
      iconColor: 'text-blue-600',
      PreviewComponent: EmailPreview
    },
    {
      id: 'content-studio',
      name: 'Content Studio',
      tagline: 'Generate AI images & visuals',
      icon: Sparkles,
      href: '/creativehub/content',
      color: 'from-purple-500 to-pink-600',
      iconColor: 'text-purple-600',
      PreviewComponent: ContentStudioPreview
    },
    {
      id: 'image-library',
      name: 'Image Library',
      tagline: 'Your saved images & media',
      icon: ImageIcon,
      href: '/creativehub/media',
      color: 'from-cyan-500 to-teal-600',
      iconColor: 'text-cyan-600',
      PreviewComponent: ImageLibraryPreview
    }
  ];

  return (
    <>
      {/* Full-screen background that goes behind everything */}
      <div className="fixed inset-0 bg-gray-50 pointer-events-none">
        {/* Full-width background base */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-100/20 via-blue-50/15 to-primary-50/10"></div>

        {/* Glassmorphic background elements */}
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

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extralight text-gray-900 mb-3">Creative Hub</h1>
            <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
              Design stunning emails and generate beautiful images with AI-powered tools
            </p>
          </div>

          {/* Main Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
            {hubModules.map((module) => (
              <Link
                key={module.id}
                href={module.href}
                className="group relative block"
              >
                {/* Minimal glass card */}
                <div className="relative backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">

                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`}></div>

                  {/* Content */}
                  <div className="relative">
                    {/* Header: Icon + Title + Arrow */}
                    <div className="flex items-center justify-between p-4 pb-3">
                      <div className="flex items-center gap-3">
                        <module.icon className={`h-5 w-5 ${module.iconColor}`} />
                        <div>
                          <h2 className="text-lg font-medium text-gray-900">
                            {module.name}
                          </h2>
                          <p className="text-xs text-gray-500 font-light mt-0.5">
                            {module.tagline}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                    </div>

                    {/* Large Preview Area */}
                    <div className="px-4 pb-4">
                      <div className="aspect-[4/3] w-full">
                        <module.PreviewComponent />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Info Footer */}
          <div className="text-center">
            <div className="backdrop-blur-xl bg-white/50 border border-white/50 rounded-xl p-4 shadow-md inline-block">
              <p className="text-xs text-gray-600 font-light">
                <span className="font-medium text-gray-800">New to Creative Hub?</span> Start with Email Templates to create professional emails, or use Content Studio to generate AI images.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
