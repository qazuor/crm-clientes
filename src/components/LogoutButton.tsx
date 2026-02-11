'use client';

import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      onClick={async () => {
        await authClient.signOut();
        router.push('/auth/login');
      }}
    >
      Cerrar Sesion
    </Button>
  );
}
