interface ClienteData {
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
}

const VARIABLE_MAP: Record<string, keyof ClienteData> = {
  nombre: 'nombre',
  email: 'email',
  telefono: 'telefono',
  whatsapp: 'whatsapp',
  direccion: 'direccion',
  ciudad: 'ciudad',
  provincia: 'provincia',
  codigoPostal: 'codigoPostal',
  industria: 'industria',
  sitioWeb: 'sitioWeb',
  instagram: 'instagram',
  facebook: 'facebook',
  linkedin: 'linkedin',
  twitter: 'twitter',
};

export function getAvailableVariables(): string[] {
  return Object.keys(VARIABLE_MAP);
}

export function render(template: string, cliente: ClienteData): string {
  let result = template;

  for (const [varName, field] of Object.entries(VARIABLE_MAP)) {
    const value = cliente[field];
    const placeholder = `{${varName}}`;
    result = result.replaceAll(placeholder, value ?? '');
  }

  return result;
}

export function validateTemplate(template: string): { valid: boolean; invalidVars: string[] } {
  const variablePattern = /\{(\w+)\}/g;
  const available = new Set(Object.keys(VARIABLE_MAP));
  const invalidVars: string[] = [];
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    if (!available.has(match[1])) {
      invalidVars.push(match[1]);
    }
  }

  return { valid: invalidVars.length === 0, invalidVars };
}
