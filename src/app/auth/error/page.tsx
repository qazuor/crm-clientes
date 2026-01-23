'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Email o contraseña incorrectos.';
      case 'OAuthSignin':
        return 'Error al iniciar sesión con el proveedor OAuth.';
      case 'OAuthCallback':
        return 'Error en el callback de OAuth.';
      case 'OAuthCreateAccount':
        return 'Error al crear la cuenta con OAuth.';
      case 'EmailCreateAccount':
        return 'Error al crear la cuenta con email.';
      case 'Callback':
        return 'Error en el callback.';
      case 'OAuthAccountNotLinked':
        return 'Para confirmar tu identidad, inicia sesión con la misma cuenta que usaste originalmente.';
      case 'EmailSignin':
        return 'El email no pudo ser enviado.';
      case 'CredentialsSignin':
        return 'Credenciales incorrectas.';
      case 'SessionRequired':
        return 'Por favor, inicia sesión para acceder a esta página.';
      default:
        return 'Ha ocurrido un error durante la autenticación.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-6 text-center">
              <h3 className="text-lg font-medium text-gray-900">Error de autenticación</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {getErrorMessage()}
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/auth/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Volver a intentar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}