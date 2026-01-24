'use client'

import { useState } from 'react'

export default function TestPage() {
  const [testInput, setTestInput] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-2xl font-bold text-center">Test de Inputs</h1>
        
        <div>
          <label htmlFor="test" className="block text-sm font-medium text-gray-700">
            Input de Prueba
          </label>
          <input
            id="test"
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            placeholder="Escribe algo aquí..."
          />
          <p className="mt-2 text-sm text-gray-600">
            Valor actual: "{testInput}"
          </p>
        </div>

        <div>
          <button
            onClick={() => setTestInput('Botón clickeado')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Probar botón
          </button>
        </div>
      </div>
    </div>
  )
}