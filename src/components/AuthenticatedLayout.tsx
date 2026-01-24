import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { 
  BuildingOffice2Icon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export default function AuthenticatedLayout({ children, currentPath = '/' }: AuthenticatedLayoutProps) {
  const isActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

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
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/clientes/nuevo">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido de la página */}
      <main>
        {children}
      </main>
    </div>
  );
}