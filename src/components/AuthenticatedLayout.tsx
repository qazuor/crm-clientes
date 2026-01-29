import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { NotificationBell } from '@/components/NotificationBell';
import {
  BuildingOffice2Icon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  userRole?: string;
}

export default function AuthenticatedLayout({
  children,
  currentPath = '/',
  userRole
}: AuthenticatedLayoutProps) {
  const isActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compartido */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <BuildingOffice2Icon className="h-8 w-8 text-blue-500 mr-3" />
                <h1 className="text-xl font-bold text-gray-900">CRM Clientes</h1>
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link
                  href="/"
                  className={`${
                    isActive('/')
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/clientes"
                  className={`${
                    isActive('/clientes')
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Clientes
                </Link>
                <Link
                  href="/actividades"
                  className={`${
                    isActive('/actividades')
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Actividades
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/settings"
                    className={`flex items-center gap-1 ${
                      isActive('/admin/settings')
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    Settings
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/clientes/nuevo">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </Link>
              <NotificationBell />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido de la pagina */}
      <main>
        {children}
      </main>
    </div>
  );
}
