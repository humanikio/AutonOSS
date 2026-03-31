'use client';

import { Upload, Camera } from 'lucide-react';

interface ChooseAvatarOptionProps {
  onUpload: () => void;
  onGenerate: () => void;
}

export default function ChooseAvatarOption({ onUpload, onGenerate }: ChooseAvatarOptionProps) {
  return (
    <div className="space-y-4">
      <p className="text-center text-gray-600 font-light mb-6">
        Choose how you'd like to update your avatar
      </p>

      <div className="space-y-3">
        {/* Upload Image Option */}
        <button
          onClick={onUpload}
          className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
        >
          <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
            <Upload className="h-6 w-6 text-primary-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Upload Image</h3>
            <p className="text-sm text-gray-500 font-light">Choose a photo from your device</p>
          </div>
        </button>

        {/* Generate Avatar Option */}
        <button
          onClick={onGenerate}
          className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
        >
          <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            <Camera className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Create Avatar</h3>
            <p className="text-sm text-gray-500 font-light">Take a selfie and we'll create a stylized avatar</p>
          </div>
        </button>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center font-light">
          Your avatar will be visible to other users in your organization
        </p>
      </div>
    </div>
  );
}