'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Image as ImageIcon, X, Loader2, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { templateImageService, TemplateImage } from '../services/templateImageService';
import ImageLibraryModal from './ImageLibraryModal';

interface TemplateImageBrowserProps {
  templateId: string;
}

export default function TemplateImageBrowser({ templateId }: TemplateImageBrowserProps) {
  const { currentTenantId, getToken } = useAuth();
  const [images, setImages] = useState<TemplateImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({ show: false, type: 'success', message: '' });

  // Fetch template images on mount
  useEffect(() => {
    if (currentTenantId && templateId) {
      loadTemplateImages();
    }
  }, [currentTenantId, templateId]);

  const loadTemplateImages = async () => {
    if (!currentTenantId || !templateId) return;

    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        setNotification({ show: true, type: 'error', message: 'Authentication required' });
        return;
      }
      const response = await templateImageService.listTemplateImages(
        currentTenantId,
        templateId,
        token
      );
      setImages(response.images);
    } catch (error) {
      console.error('[Template Image Browser] Error loading images:', error);
      setNotification({ show: true, type: 'error', message: 'Failed to load template images' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!currentTenantId || !templateId) return;

    try {
      setRemovingImageId(imageId);
      const token = await getToken();
      if (!token) {
        setNotification({ show: true, type: 'error', message: 'Authentication required' });
        return;
      }
      await templateImageService.removeImageFromTemplate(
        currentTenantId,
        templateId,
        imageId,
        token
      );

      // Remove from local state
      setImages(prev => prev.filter(img => img.id !== imageId));
      setNotification({ show: true, type: 'success', message: 'Image removed from template' });
    } catch (error) {
      console.error('[Template Image Browser] Error removing image:', error);
      setNotification({ show: true, type: 'error', message: 'Failed to remove image from template' });
    } finally {
      setRemovingImageId(null);
    }
  };

  const handleImageAdded = () => {
    // Reload images after adding from library
    loadTemplateImages();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading images...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="backdrop-blur-xl bg-white/90 border border-gray-200 rounded-xl shadow-sm p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Template Images ({images.length})
          </h3>
          <button
            onClick={() => setIsLibraryModalOpen(true)}
            className="px-3 py-1.5 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Browse Library
          </button>
        </div>

        {/* Images Grid */}
        <div className="flex-1 overflow-auto">
          {images.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">No images added yet</p>
                <p className="text-xs text-gray-500 mb-4">
                  Add images from your library to use in this template
                </p>
                <button
                  onClick={() => setIsLibraryModalOpen(true)}
                  className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Browse Library
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow">
                    {/* Image Preview */}
                    <div className="aspect-video bg-gray-100 rounded-lg mb-2 overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.purpose || 'Template image'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Image Info */}
                    <div className="space-y-1">
                      {image.purpose && (
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {image.purpose}
                        </p>
                      )}
                      {image.dimensions && (
                        <p className="text-xs text-gray-500">{image.dimensions}</p>
                      )}
                      {image.addedFrom === 'library' && (
                        <div className="flex items-center gap-1">
                          <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            Library
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      disabled={removingImageId === image.id}
                      className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 disabled:opacity-50"
                      title="Remove from template"
                    >
                      {removingImageId === image.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>

                    {/* Copy URL Button (on hover) */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(image.url);
                        setNotification({ show: true, type: 'success', message: 'Image URL copied to clipboard!' });
                      }}
                      className="absolute bottom-1 right-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-90 transition-opacity"
                      title="Copy image URL"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Library Modal */}
      <ImageLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        templateId={templateId}
        onImageAdded={handleImageAdded}
      />

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top duration-300">
          <div className={`backdrop-blur-xl ${notification.type === 'success' ? 'bg-green-50/90' : 'bg-red-50/90'} border ${notification.type === 'success' ? 'border-green-200' : 'border-red-200'} rounded-xl shadow-lg p-4 flex items-center gap-3 min-w-[300px]`}>
            {notification.type === 'success' ? (
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            )}
            <p className={`flex-1 text-sm font-medium ${notification.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="p-1 hover:bg-white/50 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
