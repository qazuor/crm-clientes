'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  KeyIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const menuItems = [
  {
    href: '/admin/settings/enrichment',
    label: 'Configuración de Enriquecimiento',
    icon: AdjustmentsHorizontalIcon,
    description: 'Parámetros de IA y análisis de sitios web',
  },
  {
    href: '/admin/settings/api-keys',
    label: 'API Keys',
    icon: KeyIcon,
    description: 'Gestionar claves de acceso a servicios externos',
  },
  {
    href: '/admin/settings/quotas',
    label: 'Quotas',
    icon: ChartBarIcon,
    description: 'Ver uso y límites de APIs',
  },
  {
    href: '/admin/settings/bulk-enrich',
    label: 'Enriquecimiento en Bloque',
    icon: SparklesIcon,
    description: 'Enriquecer múltiples clientes a la vez',
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1">
        <h2 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Configuración
        </h2>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              />
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div
                  className={`text-xs ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
