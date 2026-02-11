'use client';

import { useState, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  /** Currently selected date */
  readonly value: Date | undefined;
  /** Callback when user selects a date */
  readonly onChange: (date: Date | undefined) => void;
  /** Placeholder text when no date is selected */
  readonly placeholder?: string;
  /** Disable the picker */
  readonly disabled?: boolean;
  /** Minimum selectable date */
  readonly minDate?: Date;
  /** Maximum selectable date */
  readonly maxDate?: Date;
  /** Additional CSS classes */
  readonly className?: string;
  /** Input label for accessibility */
  readonly label?: string;
}

/**
 * Custom date picker component using react-day-picker.
 * Provides a consistent date selection experience across browsers.
 */
function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled = false,
  minDate,
  maxDate,
  className,
  label,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      onChange(date);
      setIsOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(undefined);
    },
    [onChange],
  );

  const formattedDate = value
    ? value.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          formattedDate ? 'text-gray-900' : 'text-gray-400',
        )}
        aria-label={label ?? placeholder}
      >
        <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {formattedDate ?? placeholder}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Clear date"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Calendar dropdown */}
          <div className="absolute z-50 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
            <DayPicker
              mode="single"
              selected={value}
              onSelect={handleSelect}
              locale={es}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              classNames={{
                root: 'text-sm',
                month_caption: 'flex justify-center font-medium text-gray-900 mb-2',
                nav: 'flex items-center justify-between',
                button_previous: 'p-1 rounded hover:bg-gray-100 text-gray-600',
                button_next: 'p-1 rounded hover:bg-gray-100 text-gray-600',
                weekdays: 'flex',
                weekday: 'w-9 text-center text-xs font-medium text-gray-500',
                week: 'flex',
                day: 'w-9 h-9 flex items-center justify-center rounded-md text-sm',
                day_button: 'w-full h-full rounded-md hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500',
                selected: 'bg-blue-600 text-white hover:bg-blue-700',
                today: 'font-bold text-blue-600',
                disabled: 'text-gray-300 cursor-not-allowed',
                outside: 'text-gray-300',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export { DatePicker };
export type { DatePickerProps };
