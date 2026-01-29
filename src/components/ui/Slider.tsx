'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className = '',
  label,
  showValue = true,
  formatValue = (v) => v.toString(),
}: SliderProps) {
  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <label className="text-sm font-medium text-gray-700">{label}</label>
          )}
          {showValue && (
            <span className="text-sm text-gray-500 tabular-nums">
              {formatValue(value[0])}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      >
        <SliderPrimitive.Track className="bg-gray-200 relative grow rounded-full h-2">
          <SliderPrimitive.Range className="absolute bg-blue-500 rounded-full h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md
                     hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          aria-label={label}
        />
      </SliderPrimitive.Root>
    </div>
  );
}
