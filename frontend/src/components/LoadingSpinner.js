import React from 'react';

export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div
          className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} mx-auto mb-4`}
        ></div>
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );
} 