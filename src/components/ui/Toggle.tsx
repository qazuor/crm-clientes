'use client';

import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}

export function Toggle({ enabled, onChange, disabled = false, size = 'md', label }: ToggleProps) {
  const sizeClasses = {
    sm: {
      container: 'w-8 h-4',
      dot: 'w-3 h-3',
      translate: 'translate-x-4'
    },
    md: {
      container: 'w-10 h-5', 
      dot: 'w-4 h-4',
      translate: 'translate-x-5'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center space-x-2">
      {label && (
        <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`
          relative inline-flex ${classes.container} rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${disabled 
            ? 'bg-gray-200 cursor-not-allowed' 
            : enabled 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-gray-300 hover:bg-gray-400'
          }
        `}
        aria-pressed={enabled}
        aria-label={label}
      >
        <span
          className={`
            ${classes.dot} inline-block rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out
            ${enabled ? classes.translate : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}