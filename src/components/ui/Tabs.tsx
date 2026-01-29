'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

interface Tab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
}: TabsProps) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue ?? tabs[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsPrimitive.List className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500
                       border-b-2 border-transparent -mb-px
                       hover:text-gray-700 hover:border-gray-300
                       data-[state=active]:text-blue-600 data-[state=active]:border-blue-600
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:ring-offset-2 rounded-t-md"
          >
            {tab.icon}
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className = '' }: TabContentProps) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={`focus:outline-none ${className}`}
    >
      {children}
    </TabsPrimitive.Content>
  );
}
