'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      ${sizeClasses[size]} w-full bg-white rounded-lg shadow-xl
                      animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]
                      focus:outline-none p-6`}
        >
          <Dialog.Title className="text-lg font-semibold text-gray-900 pr-8">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="text-sm text-gray-500 mt-1">
              {description}
            </Dialog.Description>
          )}

          <div className="mt-4">{children}</div>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 p-1 rounded-md text-gray-400
                         hover:text-gray-500 hover:bg-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`mt-6 flex justify-end gap-3 ${className}`}>{children}</div>
  );
}
