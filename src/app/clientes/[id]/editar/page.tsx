import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EditarClienteForm from './EditarClienteForm';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { 
  ArrowLeftIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';

interface EditarClienteProps {
  params: {
    id: string;
  };
}

export default async function EditarClientePage({ params }: EditarClienteProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  // Await params for Next.js 15+
  const { id } = await params;

  // Obtener cliente específico
  const cliente = await prisma.cliente.findUnique({
    where: { id },
  });

  if (!cliente) {
    notFound();
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
                <Link href="/clientes" className="text-blue-600 font-medium">Clientes</Link>
                <Link href="/actividades" className="text-gray-500 hover:text-gray-900">Actividades</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/clientes" className="hover:text-gray-900">
              Clientes
            </Link>
            <span>/</span>
            <Link href={`/clientes/${cliente.id}`} className="hover:text-gray-900">
              {cliente.nombre}
            </Link>
            <span>/</span>
            <span className="text-gray-900">Editar</span>
          </nav>
        </div>

        {/* Título */}
        <div className="mb-8">
          <Link href={`/clientes/${cliente.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a detalles
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Editar Cliente: {cliente.nombre}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Actualiza la información del cliente
          </p>
        </div>

        {/* Formulario */}
        <EditarClienteForm cliente={cliente} />
      </main>
    </div>
  );
}