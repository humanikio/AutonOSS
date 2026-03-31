'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Image as ImageIcon,
  Search,
  Filter,
  Trash2,
  Download,
  Loader2,
  X,
  Tag,
  Calendar,
  FileImage,
  Mail,
  Sparkles,
  Upload,
  Plus,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface LibraryImage {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  source: string;
  sourceId?: string;
  purpose?: string;
  tags: string[];
  createdAt: string;
  createdBy?: string;
}

export default function MediaLibraryPage() {
  const { currentTenantId, getToken } = useAuth();

  const [images, setImages] = useState<LibraryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<LibraryImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'all'>('grouped');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPurpose, setUploadPurpose] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Custom alert/confirm modals
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; imageId: string | null }>({ show: false, imageId: null });
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({ show: false, type: 'success', message: '' });

  // Load images
  useEffect(() => {
    if (currentTenantId) {
      loadImages();
    }
  }, [currentTenantId]);

  const loadImages = async () => {
    if (!currentTenantId) return;

    setIsLoading(true);
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
        setImages(data.images || []);
      } else {
        console.error('Failed to load images');
      }
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!currentTenantId) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/image-library/${imageId}?tenantId=${currentTenantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId));
        setSelectedImage(null);
        setConfirmDelete({ show: false, imageId: null });
        setNotification({ show: true, type: 'success', message: 'Image deleted successfully!' });
      } else {
        const error = await response.json();
        setNotification({ show: true, type: 'error', message: `Failed to delete image: ${error.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      setNotification({ show: true, type: 'error', message: 'Error deleting image' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (image: LibraryImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadImage = async () => {
    if (!currentTenantId || !uploadFile) return;

    setIsUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', uploadFile);
      formData.append('tenantId', currentTenantId);
      formData.append('source', 'manual');

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
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadPurpose('');
        setUploadTags('');
        setNotification({ show: true, type: 'success', message: 'Image uploaded successfully!' });
        loadImages(); // Reload images
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

  // Filter images
  const filteredImages = images.filter(img => {
    const matchesSearch = searchQuery === '' ||
      img.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSource = selectedSource === 'all' || img.source === selectedSource;

    return matchesSearch && matchesSource;
  });

  // Group images by source
  const groupedImages = filteredImages.reduce((acc, img) => {
    if (!acc[img.source]) {
      acc[img.source] = [];
    }
    acc[img.source].push(img);
    return acc;
  }, {} as Record<string, LibraryImage[]>);

  // Get unique sources for filter
  const sources = ['all', ...Array.from(new Set(images.map(img => img.source)))];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'contentStudio': 'Content Studio',
      'emailTemplate': 'Email Template',
      'manual': 'Manual Uploads',
      'all': 'All Sources'
    };
    return labels[source] || source;
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'contentStudio':
        return Sparkles;
      case 'emailTemplate':
        return Mail;
      case 'manual':
        return Upload;
      default:
        return ImageIcon;
    }
  };

  const getSourceDescription = (source: string) => {
    const descriptions: Record<string, string> = {
      'contentStudio': 'AI-generated images from Content Studio',
      'emailTemplate': 'Images generated for email templates',
      'manual': 'Images uploaded manually by users'
    };
    return descriptions[source] || 'Images from unknown source';
  };

  // Determine if we should show grouped view
  const shouldShowGrouped = viewMode === 'grouped' && selectedSource === 'all' && searchQuery === '';

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading image library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/creativehub"
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-light text-gray-900">Image Library</h1>
                <p className="text-sm text-gray-500">
                  {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'}
                </p>
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors shadow-sm"
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename or tags..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            {/* Source Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm appearance-none bg-white"
              >
                {sources.map(source => (
                  <option key={source} value={source}>
                    {getSourceLabel(source)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredImages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
                <ImageIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedSource !== 'all' ? 'No images found' : 'No images yet'}
              </h3>
              <p className="text-gray-500 mb-1">
                {searchQuery || selectedSource !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Generate images in Content Studio or upload from Email Templates'}
              </p>
            </div>
          </div>
        ) : shouldShowGrouped ? (
          // Grouped view by source
          <div className="space-y-12">
            {Object.entries(groupedImages).map(([source, sourceImages]) => {
              const SourceIcon = getSourceIcon(source);
              return (
                <div key={source}>
                  {/* Section Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary-50 rounded-lg">
                        <SourceIcon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-light text-gray-900">{getSourceLabel(source)}</h2>
                        <p className="text-sm text-gray-500">{getSourceDescription(source)} • {sourceImages.length} {sourceImages.length === 1 ? 'image' : 'images'}</p>
                      </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-gray-300 via-gray-200 to-transparent mt-3"></div>
                  </div>

                  {/* Images Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sourceImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      >
                        {/* Image */}
                        <div className="aspect-square bg-gray-100 relative overflow-hidden">
                          <img
                            src={image.url}
                            alt={image.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(image);
                                }}
                                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                title="Download"
                              >
                                <Download className="h-4 w-4 text-gray-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDelete({ show: true, imageId: image.id });
                                }}
                                className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                          <p className="text-xs font-medium text-gray-900 truncate mb-1">
                            {image.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatFileSize(image.fileSize)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Regular grid view (when filtering)
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                {/* Image */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ show: true, imageId: image.id });
                        }}
                        className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-900 truncate mb-1">
                    {image.fileName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                      {getSourceLabel(image.source)}
                    </span>
                    <span>{formatFileSize(image.fileSize)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Image Details</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Preview */}
                <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center p-4">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.fileName}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>

                {/* Image Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                      <FileImage className="h-3.5 w-3.5" />
                      File Name
                    </label>
                    <p className="text-sm text-gray-900 font-medium">{selectedImage.fileName}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Created
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(selectedImage.createdAt)}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                      Source
                    </label>
                    <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium">
                      {getSourceLabel(selectedImage.source)}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                      File Details
                    </label>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p>Size: {formatFileSize(selectedImage.fileSize)}</p>
                      <p>Type: {selectedImage.mimeType}</p>
                    </div>
                  </div>

                  {selectedImage.tags.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                        <Tag className="h-3.5 w-3.5" />
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedImage.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedImage.purpose && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                        Purpose
                      </label>
                      <p className="text-sm text-gray-900">{selectedImage.purpose}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-200 flex gap-3">
                    <button
                      onClick={() => handleDownload(selectedImage)}
                      className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ show: true, imageId: selectedImage.id })}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Image Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Upload Image</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image File
                </label>
                {uploadFile ? (
                  <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-50 rounded-lg">
                        <FileImage className="h-5 w-5 text-primary-600" />
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
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadFile(file);
                      }}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to select an image</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Purpose Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose (Optional)
                </label>
                <input
                  type="text"
                  value={uploadPurpose}
                  onChange={(e) => setUploadPurpose(e.target.value)}
                  placeholder="e.g., header, icon, background"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="Separate tags with commas: marketing, banner, promo"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
              </div>

              {/* Upload Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadImage}
                  disabled={!uploadFile || isUploading}
                  className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDelete.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Image</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to delete this image? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete({ show: false, imageId: null })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete.imageId && handleDeleteImage(confirmDelete.imageId)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
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
