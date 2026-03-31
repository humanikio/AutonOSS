'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Loader2, Image as ImageIcon, Plus, Check, Upload, FileImage, CheckCircle, AlertCircle } from 'lucide-react';
import { imageLibraryService, LibraryImage } from '../services/imageLibraryService';
import { templateImageService } from '../services/templateImageService';

interface ImageLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  onImageAdded?: () => void;
}

export default function ImageLibraryModal({
  isOpen,
  onClose,
  templateId,
  onImageAdded
}: ImageLibraryModalProps) {
  const { currentTenantId, getToken } = useAuth();
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingImageId, setAddingImageId] = useState<string | null>(null);
  const [addedImageIds, setAddedImageIds] = useState<Set<string>>(new Set());

  // Upload state
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPurpose, setUploadPurpose] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({ show: false, type: 'success', message: '' });

  // Load library images when modal opens
  useEffect(() => {
    if (isOpen && currentTenantId) {
      loadLibraryImages();
    }
  }, [isOpen, currentTenantId]);

  const loadLibraryImages = async () => {
    if (!currentTenantId) return;

    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        setNotification({ show: true, type: 'error', message: 'Authentication required' });
        return;
      }
      const response = await imageLibraryService.listLibraryImages(
        currentTenantId,
        token,
        {
          // Show all images from library (not just emailTemplate)
          limit: 100
        }
      );
      // Filter to only show PNG images for template use
      const pngImages = response.images.filter(img => img.mimeType === 'image/png');
      setLibraryImages(pngImages);
    } catch (error) {
      console.error('[Image Library Modal] Error loading library images:', error);
      setNotification({ show: true, type: 'error', message: 'Failed to load library images' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddImage = async (libraryImageId: string) => {
    if (!currentTenantId || !templateId) return;

    try {
      setAddingImageId(libraryImageId);
      const token = await getToken();
      if (!token) {
        setNotification({ show: true, type: 'error', message: 'Authentication required' });
        return;
      }
      await templateImageService.addImageToTemplate(
        currentTenantId,
        templateId,
        libraryImageId,
        token
      );

      // Mark as added
      setAddedImageIds(prev => new Set(prev).add(libraryImageId));

      // Notify parent
      onImageAdded?.();

      // Auto-close after short delay to show success
      setTimeout(() => {
        onClose();
        // Reset added state when modal closes
        setTimeout(() => setAddedImageIds(new Set()), 300);
      }, 800);
    } catch (error) {
      console.error('[Image Library Modal] Error adding image:', error);
      setNotification({ show: true, type: 'error', message: 'Failed to add image to template' });
    } finally {
      setAddingImageId(null);
    }
  };

  const handleUploadImage = async () => {
    if (!currentTenantId || !uploadFile) return;

    setIsUploading(true);
    try {
      const token = await getToken();
      if (!token) {
        setNotification({ show: true, type: 'error', message: 'Authentication required' });
        return;
      }
      const formData = new FormData();
      formData.append('image', uploadFile);
      formData.append('tenantId', currentTenantId);
      formData.append('source', 'emailTemplate');

      if (uploadPurpose) {
        formData.append('purpose', uploadPurpose);
      }

      if (uploadTags) {
        const tagsArray = uploadTags.split(',').map(t => t.trim()).filter(t => t);
        formData.append('tags', JSON.stringify(tagsArray));
      }

      const response = await fetch('/api/image-library/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setShowUploadSection(false);
        setUploadFile(null);
        setUploadPurpose('');
        setUploadTags('');
        setNotification({ show: true, type: 'success', message: 'Image uploaded successfully!' });
        loadLibraryImages(); // Reload library images
      } else {
        const error = await response.json();
        setNotification({ show: true, type: 'error', message: `Failed to upload image: ${error.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setNotification({ show: true, type: 'error', message: 'Error uploading image' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Browse Image Library
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Select images from your library to add to this template
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadSection(!showUploadSection)}
              className="flex items-center gap-2 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Upload className="h-4 w-4" />
              {showUploadSection ? 'Hide Upload' : 'Upload New'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Upload Section */}
          {showUploadSection && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Upload New Image</h3>
              <div className="space-y-3">
                {/* File Input */}
                {uploadFile ? (
                  <div className="border border-gray-200 rounded-lg p-3 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary-50 rounded-lg">
                        <FileImage className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(uploadFile.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadFile(null)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file type is PNG
                          if (file.type !== 'image/png') {
                            setNotification({ show: true, type: 'error', message: 'Only PNG images are allowed for email templates' });
                            e.target.value = '';
                            return;
                          }
                          setUploadFile(file);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">Click to select an image</p>
                      <p className="text-xs text-gray-500 mt-1">PNG only, up to 10MB</p>
                    </div>
                  </label>
                )}

                {/* Purpose Input */}
                <input
                  type="text"
                  value={uploadPurpose}
                  onChange={(e) => setUploadPurpose(e.target.value)}
                  placeholder="Purpose (e.g., header, icon, background)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />

                {/* Tags Input */}
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />

                {/* Upload Button */}
                <button
                  onClick={handleUploadImage}
                  disabled={!uploadFile || isUploading}
                  className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload to Library
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Library Images */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading library images...</p>
              </div>
            </div>
          ) : libraryImages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">No images in library</p>
                <p className="text-xs text-gray-500 mb-4">
                  Upload images or generate them with AI to add to your library
                </p>
                <button
                  onClick={() => setShowUploadSection(true)}
                  className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
                >
                  <Upload className="h-4 w-4" />
                  Upload Image
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {libraryImages.map((image) => {
                const isAdded = addedImageIds.has(image.id);
                const isAdding = addingImageId === image.id;

                return (
                  <div
                    key={image.id}
                    className={`relative group border rounded-lg overflow-hidden transition-all ${
                      isAdded
                        ? 'border-green-500 ring-2 ring-green-500'
                        : 'border-gray-200 hover:border-primary-400 hover:shadow-md'
                    }`}
                  >
                    {/* Image Preview */}
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.purpose || image.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Image Info */}
                    <div className="p-3 bg-white">
                      <p className="text-xs font-medium text-gray-700 truncate mb-1">
                        {image.purpose || image.fileName}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {(image.fileSize / 1024).toFixed(1)} KB
                        </p>
                        {image.tags.length > 0 && (
                          <div className="flex gap-1">
                            {image.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Button Overlay */}
                    {!isAdded && (
                      <button
                        onClick={() => handleAddImage(image.id)}
                        disabled={isAdding}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isAdding ? (
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        ) : (
                          <div className="text-center">
                            <Plus className="h-8 w-8 text-white mx-auto mb-2" />
                            <span className="text-white text-sm font-medium">Add to Template</span>
                          </div>
                        )}
                      </button>
                    )}

                    {/* Added Indicator */}
                    {isAdded && (
                      <div className="absolute inset-0 bg-green-500/90 flex items-center justify-center">
                        <div className="text-center">
                          <Check className="h-8 w-8 text-white mx-auto mb-2" />
                          <span className="text-white text-sm font-medium">Added!</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {libraryImages.length} {libraryImages.length === 1 ? 'image' : 'images'} in library
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>

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
