'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ContactModal } from '@/components/ContactModal';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { WhatsAppIcon } from '@/components/ui/SocialIcons';

interface ContactButtonsProps {
  cliente: {
    id: string;
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
    provincia?: string | null;
    codigoPostal?: string | null;
    industria?: string | null;
    sitioWeb?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
    twitter?: string | null;
  };
}

export function ContactButtons({ cliente }: ContactButtonsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'email' | 'whatsapp'>('email');

  const openEmail = useCallback(() => {
    setDefaultTab('email');
    setIsModalOpen(true);
  }, []);

  const openWhatsApp = useCallback(() => {
    setDefaultTab('whatsapp');
    setIsModalOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      {cliente.email && (
        <Button variant="outline" size="sm" onClick={openEmail}>
          <EnvelopeIcon className="h-4 w-4 mr-1" />
          Email
        </Button>
      )}
      {cliente.whatsapp && (
        <Button variant="outline" size="sm" onClick={openWhatsApp} className="text-green-700 border-green-300 hover:bg-green-50">
          <WhatsAppIcon className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
      )}

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cliente={cliente}
        onSuccess={handleSuccess}
        defaultTab={defaultTab}
      />
    </>
  );
}
