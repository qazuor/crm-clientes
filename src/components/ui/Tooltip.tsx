'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface TooltipProps {
  /** The element that triggers the tooltip */
  readonly children: ReactNode;
  /** Tooltip content text */
  readonly content: string;
  /** Side where the tooltip appears */
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment of the tooltip relative to the trigger */
  readonly align?: 'start' | 'center' | 'end';
  /** Delay in ms before showing the tooltip */
  readonly delayDuration?: number;
}

/**
 * A tooltip component built on Radix Tooltip.
 * Provides contextual help text on hover/focus.
 */
function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 300,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            className={cn(
              'z-50 max-w-xs rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2',
              'data-[side=top]:slide-in-from-bottom-2',
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip };
export type { TooltipProps };
