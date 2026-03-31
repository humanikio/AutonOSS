'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Save,
  X,
  Check,
  BookmarkPlus
} from 'lucide-react';
import Link from 'next/link';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  complimentaryColor?: string;
  isSavedToLibrary?: boolean;
  libraryFileId?: string;
  libraryUrl?: string;
}

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '3:2' | '2:3';
type ImageStyle = 'photorealistic' | 'artistic' | 'illustration' | 'minimal' | 'cinematic' | 'anime';

export default function ContentEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { currentTenantId, getToken } = useAuth();

  const sessionId = params.id as string;
  const isFallback = sessionId.startsWith('fallback');

  const [sessionName, setSessionName] = useState('Untitled Session');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('photorealistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [bgColor, setBgColor] = useState('#6b7280'); // default gray
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to convert hex to rgba for gradient
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const aspectRatios: { value: AspectRatio; label: string; dimensions: string }[] = [
    { value: '1:1', label: 'Square', dimensions: '1024×1024' },
    { value: '16:9', label: 'Landscape', dimensions: '1920×1080' },
    { value: '9:16', label: 'Portrait', dimensions: '1080×1920' },
    { value: '4:3', label: 'Standard', dimensions: '1600×1200' },
    { value: '3:4', label: 'Portrait', dimensions: '1200×1600' },
    { value: '21:9', label: 'Ultra Wide', dimensions: '2560×1080' },
    { value: '3:2', label: 'Photo', dimensions: '1500×1000' },
    { value: '2:3', label: 'Photo Portrait', dimensions: '1000×1500' }
  ];

  const imageStyles: { value: ImageStyle; label: string; description: string }[] = [
    { value: 'photorealistic', label: 'Photorealistic', description: 'Realistic photography' },
    { value: 'artistic', label: 'Artistic', description: 'Painterly expression' },
    { value: 'illustration', label: 'Illustration', description: 'Digital illustration' },
    { value: 'minimal', label: 'Minimal', description: 'Clean aesthetic' },
    { value: 'cinematic', label: 'Cinematic', description: 'Movie-like mood' },
    { value: 'anime', label: 'Anime', description: 'Japanese animation' }
  ];

  // Load session data
  useEffect(() => {
    if (sessionId && currentTenantId && !isFallback) {
      loadSession();
    } else if (isFallback) {
      setIsLoading(false);
    }
  }, [sessionId, currentTenantId]);

  const loadSession = async () => {
    if (!currentTenantId || !sessionId) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/content-sessions/${sessionId}?tenantId=${currentTenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessionName(data.name);
        setPrompt(data.prompt || '');

        // Load generated images
        const assetsResponse = await fetch(`/api/content-sessions/${sessionId}/assets?tenantId=${currentTenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (assetsResponse.ok) {
          const assets = await assetsResponse.json();
          setGeneratedImages(assets);
        }
      } else {
        console.error('Failed to load session');
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save functionality
  const saveSession = async (skipDebounce = false) => {
    if (!currentTenantId || !sessionId || isFallback) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const performSave = async () => {
      setIsSaving(true);
      try {
        const token = await getToken();
        const response = await fetch(`/api/content-sessions/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantId: currentTenantId,
            name: sessionName,
            prompt: prompt,
            imageCount: generatedImages.length
          })
        });

        if (response.ok) {
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Error saving session:', error);
      } finally {
        setIsSaving(false);
      }
    };

    if (skipDebounce) {
      performSave();
    } else {
      saveTimeoutRef.current = setTimeout(performSave, 2000);
    }
  };

  // Auto-save when content changes
  useEffect(() => {
    if (!isLoading && !isFallback) {
      saveSession();
    }
  }, [prompt, sessionName]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !currentTenantId || !sessionId) return;

    setIsGenerating(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/content-sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          prompt: prompt,
          aspectRatio: aspectRatio,
          style: imageStyle,
          quality: 'high'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newImage: GeneratedImage = {
          id: data.asset.id,
          url: data.asset.url,
          prompt: data.asset.prompt,
          createdAt: data.asset.createdAt,
          complimentaryColor: data.asset.complimentaryColor
        };

        setGeneratedImages(prev => [newImage, ...prev]);
        setSelectedImage(newImage);
      } else {
        const error = await response.json();
        console.error('Failed to generate image:', error);
        alert(error.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error generating image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `generated-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteImage = (imageId: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
    if (selectedImage?.id === imageId) {
      setSelectedImage(generatedImages[0] || null);
    }
  };

  const handleSaveToLibrary = async (image: GeneratedImage) => {
    if (!currentTenantId || !sessionId) return;

    setIsSavingToLibrary(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/content-sessions/${sessionId}/assets/${image.id}/save-to-library`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          tags: [aspectRatio, imageStyle],
          purpose: 'ai-generated'
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Update the image in the local state to mark it as saved
        setGeneratedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, isSavedToLibrary: true, libraryFileId: data.libraryFileId, libraryUrl: data.libraryUrl }
              : img
          )
        );

        // Update selected image if it's the one we just saved
        if (selectedImage?.id === image.id) {
          setSelectedImage({
            ...selectedImage,
            isSavedToLibrary: true,
            libraryFileId: data.libraryFileId,
            libraryUrl: data.libraryUrl
          });
        }

        alert('✅ Image saved to library successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save to library: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving to library:', error);
      alert('Error saving to library');
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  // Auto-select first image when images load
  useEffect(() => {
    if (generatedImages.length > 0 && !selectedImage) {
      setSelectedImage(generatedImages[0]);
    }
  }, [generatedImages]);

  // Use AI-suggested background color from selected image
  useEffect(() => {
    if (selectedImage?.complimentaryColor) {
      console.log('🎨 Using AI-suggested color:', selectedImage.complimentaryColor);
      setBgColor(selectedImage.complimentaryColor);
    } else {
      setBgColor('#6b7280'); // default gray
    }
  }, [selectedImage]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 overflow-hidden">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 flex-shrink-0">
        <div className="px-4 py-2 flex items-center gap-3">
          <Link
            href="/creativehub/content"
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 px-1 flex-1"
            placeholder="Untitled Session"
          />
          {isFallback && (
            <span className="text-xs text-gray-400">Demo Mode</span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Generation Controls */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            <div className="space-y-4">
              {/* Prompt Input - Larger */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe Your Image
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A photorealistic landscape with mountains at sunset..."
                  className="w-full h-48 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
                />
              </div>

              {/* Aspect Ratio - Compact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`p-2 rounded-lg border transition-all text-left ${
                        aspectRatio === ratio.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-900">{ratio.label}</div>
                      <div className="text-xs text-gray-500">{ratio.value}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style - Compact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {imageStyles.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setImageStyle(style.value)}
                      className={`p-2 rounded-lg border transition-all text-left ${
                        imageStyle === style.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-900">{style.label}</div>
                      <div className="text-xs text-gray-400">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side - Preview Area */}
        <div
          className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 relative transition-all duration-700"
          style={{
            backgroundColor: '#f3f4f6'
          }}
        >
          {/* Color overlay */}
          {generatedImages.length > 0 && (
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-700"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(bgColor, 0.5)}, ${hexToRgba(bgColor, 0.3)}, ${hexToRgba(bgColor, 0.15)})`
              }}
            />
          )}
          {generatedImages.length > 0 ? (
            <>
              {/* Large Preview Area */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-hidden min-h-0 relative z-10">
                {selectedImage && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.prompt}
                      className="max-w-[85%] max-h-[85%] w-auto h-auto object-contain rounded-lg shadow-2xl border-4 border-black"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      {selectedImage.isSavedToLibrary ? (
                        <div
                          className="p-3 bg-green-500 text-white rounded-lg shadow-lg flex items-center gap-2"
                          title="Saved to Library"
                        >
                          <Check className="h-5 w-5" />
                          <span className="text-sm font-medium">Saved</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSaveToLibrary(selectedImage)}
                          disabled={isSavingToLibrary}
                          className="p-3 bg-white/90 hover:bg-white text-gray-900 rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Save to Library"
                        >
                          {isSavingToLibrary ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <BookmarkPlus className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(selectedImage)}
                        className="p-3 bg-white/90 hover:bg-white text-gray-900 rounded-lg transition-colors shadow-lg"
                        title="Download"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(selectedImage.id)}
                        className="p-3 bg-white/90 hover:bg-white text-red-600 rounded-lg transition-colors shadow-lg"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery Below */}
              <div className="h-28 bg-white/90 border-t border-gray-200 p-3 overflow-x-auto flex-shrink-0 relative z-10">
                <div className="flex gap-2 h-full justify-center">
                  {generatedImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImage(image)}
                      className={`relative flex-shrink-0 h-full aspect-square rounded-lg overflow-hidden transition-all ${
                        selectedImage?.id === image.id
                          ? 'ring-4 ring-primary-500 shadow-lg'
                          : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-primary-300'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-contain bg-gray-50"
                      />
                      {selectedImage?.id === image.id && (
                        <div className="absolute top-1 right-1 p-0.5 bg-primary-500 rounded-full">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      {image.isSavedToLibrary && (
                        <div className="absolute bottom-1 left-1 p-0.5 bg-green-500 rounded-full">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
                  <ImageIcon className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No images yet</h3>
                <p className="text-gray-500 mb-1">Enter a prompt and generate your first image</p>
                <p className="text-sm text-gray-400">Your generated images will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
