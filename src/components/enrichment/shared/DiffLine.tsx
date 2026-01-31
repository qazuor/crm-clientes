'use client';

interface DiffLineProps {
  fieldName: string;
  currentValue: string | null;
  suggestedValue: string;
}

/**
 * Shows a value diff: current (red/strikethrough) → suggested (green).
 */
export function DiffLine({ fieldName, currentValue, suggestedValue }: DiffLineProps) {
  const displayCurrent = currentValue?.trim() || '(vacío)';
  const hasChange = displayCurrent !== suggestedValue;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {fieldName}
      </span>
      <div className="flex items-center gap-2 text-sm">
        {hasChange ? (
          <>
            <span className="line-through text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              {displayCurrent}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-medium">
              {suggestedValue}
            </span>
          </>
        ) : (
          <span className="text-gray-700">{suggestedValue}</span>
        )}
      </div>
    </div>
  );
}
