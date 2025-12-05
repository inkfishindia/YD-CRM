import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-50 transition-all transform animate-fade-in-up ${
        type === 'success' ? 'bg-gray-800 text-white' : 'bg-red-500 text-white'
    }`}>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};