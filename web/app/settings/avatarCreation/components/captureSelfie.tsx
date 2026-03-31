'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ArrowLeft, RotateCcw } from 'lucide-react';

interface CaptureSelfieProps {
  onCapture: (imageData: string) => void;
  onBack: () => void;
  onSetCleanup?: (cleanup: () => void) => void;
}

export default function CaptureSelfie({ onCapture, onBack, onSetCleanup }: CaptureSelfieProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Cleanup function to stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Provide cleanup function to parent
  useEffect(() => {
    if (onSetCleanup) {
      onSetCleanup(stopCamera);
    }
  }, [onSetCleanup]);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure you have granted camera permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    onCapture(imageData);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Camera View - Smaller and centered */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <div className="relative w-80 h-80 bg-gray-100 rounded-xl overflow-hidden shadow-lg">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="animate-spin w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-6">
              <div className="text-center">
                <div className="text-red-500 mb-2">
                  <Camera className="h-12 w-12 mx-auto opacity-50" />
                </div>
                <p className="text-sm text-gray-600">{error}</p>
                <button
                  onClick={startCamera}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            onLoadedMetadata={() => setIsLoading(false)}
          />

          {/* Camera Controls Overlay */}
          <div className="absolute top-4 right-4">
            <button
              onClick={toggleCamera}
              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Switch Camera"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Floating Capture Button at bottom of camera */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <button
              onClick={captureImage}
              disabled={isLoading || !!error}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-colors shadow-lg hover:shadow-xl"
            >
              Looks Good
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Canvas for Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Back Button */}
      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center font-light mt-2">
        Position your face in the center and click "Looks Good" when ready
      </p>
    </div>
  );
}