import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { NuevoClienteForm } from './NuevoClienteForm';

export default async function NuevoClientePage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <BuildingOffice2Icon className="h-8 w-8 text-blue-500 mr-3" />
                <h1 className="text-xl font-bold text-gray-900">CRM Clientes</h1>
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
                <Link href="/clientes" className="text-gray-500 hover:text-gray-900">Clientes</Link>
                <Link href="/actividades" className="text-gray-500 hover:text-gray-900">Actividades</Link>
              </nav>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Breadcrumbs
            items={[
              { label: 'Clientes', href: '/clientes' },
              { label: 'Nuevo Cliente' },
            ]}
          />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Agregar Nuevo Cliente</h2>
          <p className="mt-1 text-sm text-gray-500">
            Completa la informacion del cliente para agregarlo al CRM
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg border">
          <NuevoClienteForm />
        </div>
      </main>
    </div>
  );
}
