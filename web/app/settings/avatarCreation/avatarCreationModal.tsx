'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import ChooseAvatarOption from './components/chooseAvatarOption';
import CaptureSelfie from './components/captureSelfie';
import ConfirmSelfie from './components/confirmSelfie';
import ProcessingImage from './components/processingImage';
import ConfirmGeneration from './components/confirmGeneration';

interface AvatarCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdate: (avatarUrl: string) => void;
  currentAvatarUrl?: string | null;
}

type Step = 'choose' | 'capture' | 'confirm-selfie' | 'processing' | 'confirm-generation';

export default function AvatarCreationModal({ 
  isOpen, 
  onClose, 
  onAvatarUpdate,
  currentAvatarUrl 
}: AvatarCreationModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const cameraCleanupRef = useRef<(() => void) | null>(null);

  const handleClose = () => {
    // Stop camera if it's running
    if (cameraCleanupRef.current) {
      cameraCleanupRef.current();
      cameraCleanupRef.current = null;
    }
    
    setCurrentStep('choose');
    setCapturedImage(null);
    setGeneratedImage(null);
    onClose();
  };

  const handleUploadOption = () => {
    // This will trigger the file input in the parent component
    handleClose();
    // Trigger upload in parent
    const event = new CustomEvent('triggerUpload');
    window.dispatchEvent(event);
  };

  const handleGenerateOption = () => {
    setCurrentStep('capture');
  };

  const handleSelfieCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setCurrentStep('confirm-selfie');
  };

  const handleSelfieConfirm = () => {
    setCurrentStep('processing');
  };

  const handleSelfieRetake = () => {
    setCapturedImage(null);
    setCurrentStep('capture');
  };

  const handleProcessingComplete = (generatedUrl: string) => {
    setGeneratedImage(generatedUrl);
    setCurrentStep('confirm-generation');
  };

  const handleGenerationConfirm = () => {
    if (generatedImage) {
      onAvatarUpdate(generatedImage);
      handleClose();
    }
  };

  const handleRegenerate = () => {
    setGeneratedImage(null);
    setCurrentStep('processing');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-light text-gray-900 text-center">
            {currentStep === 'choose' && 'Update Avatar'}
            {currentStep === 'capture' && 'Take a Selfie'}
            {currentStep === 'confirm-selfie' && 'Review Selfie'}
            {currentStep === 'processing' && 'Creating Your Avatar'}
            {currentStep === 'confirm-generation' && 'Your New Avatar'}
          </h2>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'choose' && (
            <ChooseAvatarOption
              onUpload={handleUploadOption}
              onGenerate={handleGenerateOption}
            />
          )}

          {currentStep === 'capture' && (
            <CaptureSelfie
              onCapture={handleSelfieCapture}
              onBack={() => setCurrentStep('choose')}
              onSetCleanup={(cleanup) => { cameraCleanupRef.current = cleanup; }}
            />
          )}

          {currentStep === 'confirm-selfie' && capturedImage && (
            <ConfirmSelfie
              imageData={capturedImage}
              onConfirm={handleSelfieConfirm}
              onRetake={handleSelfieRetake}
            />
          )}

          {currentStep === 'processing' && capturedImage && (
            <ProcessingImage
              selfieData={capturedImage}
              onComplete={handleProcessingComplete}
            />
          )}

          {currentStep === 'confirm-generation' && generatedImage && (
            <ConfirmGeneration
              generatedImage={generatedImage}
              onConfirm={handleGenerationConfirm}
              onRegenerate={handleRegenerate}
            />
          )}
        </div>
      </div>
    </div>
  );
}