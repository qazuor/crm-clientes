'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

export default function LogoutButton() {
  return (
    <Button 
      variant="outline" 
      onClick={() => signOut({ callbackUrl: '/auth/login' })}
    >
      Cerrar Sesión
    </Button>
  );
}