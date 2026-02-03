import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { SettingsSidebar } from '@/components/admin/settings/SettingsSidebar';

export const metadata: Metadata = {
  title: 'Configuracion - CRM Clientes',
  description: 'Configuracion del sistema de enriquecimiento',
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <AuthenticatedLayout currentPath="/admin/settings" userRole={session.user.role}>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <SettingsSidebar />
        <main className="flex-1 p-6 bg-gray-50 overflow-auto">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
}
