'use client';

import React from 'react';
import { SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';

interface UltimaIADisplayProps {
  fecha?: Date | null;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
}

export function UltimaIADisplay({ fecha, size = 'sm', showIcon = true }: UltimaIADisplayProps) {
  if (!fecha) {
    return (
      <span className={`inline-flex items-center text-gray-400 ${
        size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : 'text-base'
      }`}>
        {showIcon && <SparklesIcon className="h-3 w-3 mr-1" />}
        Sin IA
      </span>
    );
  }

  const now = new Date();
  const diffMs = now.getTime() - fecha.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  let timeText = '';
  let colorClass = '';

  if (diffMinutes < 5) {
    timeText = 'Hace unos minutos';
    colorClass = 'text-green-600';
  } else if (diffMinutes < 60) {
    timeText = `Hace ${diffMinutes}m`;
    colorClass = 'text-green-600';
  } else if (diffHours < 24) {
    timeText = `Hace ${diffHours}h`;
    colorClass = 'text-blue-600';
  } else if (diffDays === 1) {
    timeText = 'Ayer';
    colorClass = 'text-yellow-600';
  } else if (diffDays <= 7) {
    timeText = `Hace ${diffDays} días`;
    colorClass = 'text-orange-600';
  } else if (diffDays <= 30) {
    timeText = `Hace ${diffDays} días`;
    colorClass = 'text-red-600';
  } else {
    timeText = fecha.toLocaleDateString('es-ES');
    colorClass = 'text-gray-500';
  }

  return (
    <span 
      className={`inline-flex items-center ${colorClass} ${
        size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : 'text-base'
      }`}
      title={`Último enrichment con IA: ${fecha.toLocaleString('es-ES')}`}
    >
      {showIcon && <SparklesIcon className="h-3 w-3 mr-1" />}
      {timeText}
    </span>
  );
}