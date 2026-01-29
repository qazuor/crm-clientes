'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  SparklesIcon,
  CheckIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { EnrichmentModal } from '@/components/EnrichmentModal';

interface EnrichButtonProps {
  clienteId: string;
  cliente?: {
    id: string;
    nombre: string;
    email: string | null;
    telefono: string | null;
    whatsapp: string | null;
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
    twitter: string | null;
    sitioWeb: string | null;
    tieneSSL: boolean | null;
    esResponsive: boolean | null;
    direccion: string | null;
    ciudad: string | null;
    provincia: string | null;
    codigoPostal: string | null;
    industria: string | null;
    notas: string | null;
  };
  onSuccess?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
  showLabel?: boolean;
}

interface EnrichmentResult {
  success: boolean;
  data?: unknown;
  enrichedData?: unknown;
  message?: string;
  error?: string;
}

export function EnrichButton({ 
  clienteId, 
  cliente,
  onSuccess,
  size = 'sm',
  variant = 'outline',
  showLabel = false
}: EnrichButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteData, setClienteData] = useState(cliente);

  const fetchClienteData = async () => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}`);
      const result = await response.json();
      if (result.success) {
        setClienteData(result.data);
      }
    } catch (error) {
      console.error('Error fetching cliente:', error);
    }
  };

  // Si no tenemos los datos del cliente, los obtenemos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cliente) {
      fetchClienteData();
    }
  }, [clienteId, cliente]);

  const handleSuccess = () => {
    setIsModalOpen(false);
    if (onSuccess) {
      onSuccess();
    }
    // Refrescar datos del cliente
    fetchClienteData();
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        onClick={() => setIsModalOpen(true)}
        className="h-7 w-7 p-0 border-gray-300"
        title="Enriquecer datos con IA"
      >
        <SparklesIcon className="h-3.5 w-3.5" />
      </Button>

      {clienteData && (
        <EnrichmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          cliente={clienteData}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}