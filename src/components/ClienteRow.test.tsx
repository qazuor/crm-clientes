import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClienteRow } from './ClienteRow';
import type { ClienteTableItem } from './TablaClientes';

const mockCliente: ClienteTableItem = {
  id: 'cl-1',
  nombre: 'Acme Corp',
  email: 'contact@acme.com',
  telefono: '+5491112345678',
  whatsapp: '+5491112345678',
  instagram: '@acme',
  facebook: null,
  linkedin: 'https://linkedin.com/company/acme',
  twitter: null,
  direccion: 'Av. Corrientes 1234',
  ciudad: 'Buenos Aires',
  estado: 'NUEVO',
  prioridad: 'ALTA',
  industria: 'Technology',
  sitioWeb: 'https://acme.com',
  ultimaIA: new Date('2026-01-15'),
  ultimoContacto: new Date('2026-02-01'),
  fechaCreacion: new Date('2025-12-01'),
  fechaModific: new Date('2026-02-05'),
};

const allColumns = [
  'nombre', 'contacto', 'estado', 'prioridad', 'industria',
  'ultimoContacto', 'ultimaIA', 'fechaCreacion', 'fechaModific',
  'sitioWeb', 'redesSociales', 'acciones',
];

const defaultProps = {
  cliente: mockCliente,
  isSelected: false,
  columnasActivas: allColumns,
  onToggleSelect: vi.fn(),
  onOpenEnrichmentModal: vi.fn(),
  onOpenContactModal: vi.fn(),
  onDelete: vi.fn(),
};

/** Helper to render ClienteRow inside a table structure */
function renderRow(props = {}) {
  return render(
    <table>
      <tbody>
        <ClienteRow {...defaultProps} {...props} />
      </tbody>
    </table>,
  );
}

describe('ClienteRow', () => {
  it('renders client name as link', () => {
    renderRow();
    const nameLink = screen.getByText('Acme Corp');
    expect(nameLink).toBeInTheDocument();
    expect(nameLink.closest('a')).toHaveAttribute('href', '/clientes/cl-1');
  });

  it('renders email and phone in contact column', () => {
    renderRow();
    expect(screen.getByText('contact@acme.com')).toBeInTheDocument();
    expect(screen.getByText('+5491112345678')).toBeInTheDocument();
  });

  it('shows "Sin contacto" when no email and no phone', () => {
    renderRow({
      cliente: { ...mockCliente, email: null, telefono: null },
    });
    expect(screen.getByText('Sin contacto')).toBeInTheDocument();
  });

  it('renders estado badge', () => {
    renderRow();
    expect(screen.getByText('NUEVO')).toBeInTheDocument();
  });

  it('renders prioridad badge', () => {
    renderRow();
    expect(screen.getByText('ALTA')).toBeInTheDocument();
  });

  it('shows "Sin prioridad" when prioridad is missing', () => {
    renderRow({
      cliente: { ...mockCliente, prioridad: undefined },
    });
    expect(screen.getByText('Sin prioridad')).toBeInTheDocument();
  });

  it('renders industry', () => {
    renderRow();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('shows "Sin especificar" when industry is null', () => {
    renderRow({
      cliente: { ...mockCliente, industria: null },
    });
    expect(screen.getByText('Sin especificar')).toBeInTheDocument();
  });

  it('renders checkbox reflecting selection state', () => {
    renderRow({ isSelected: false });
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('checks checkbox when selected', () => {
    renderRow({ isSelected: true });
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('applies aria-selected when row is selected', () => {
    const { container } = renderRow({ isSelected: true });
    const tr = container.querySelector('tr');
    expect(tr).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onToggleSelect with client id on checkbox change', () => {
    const onToggleSelect = vi.fn();
    renderRow({ onToggleSelect });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleSelect).toHaveBeenCalledWith('cl-1');
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    renderRow({ onDelete });
    fireEvent.click(screen.getByTitle('Eliminar cliente'));
    expect(onDelete).toHaveBeenCalledWith(mockCliente);
  });

  it('calls onOpenEnrichmentModal when AI button clicked', () => {
    const onOpenEnrichmentModal = vi.fn();
    renderRow({ onOpenEnrichmentModal });
    fireEvent.click(screen.getByTitle('Buscar información con IA (OpenAI)'));
    expect(onOpenEnrichmentModal).toHaveBeenCalledWith(mockCliente);
  });

  it('calls onOpenContactModal for email', () => {
    const onOpenContactModal = vi.fn();
    renderRow({ onOpenContactModal });
    fireEvent.click(screen.getByTitle('Enviar email con plantilla'));
    expect(onOpenContactModal).toHaveBeenCalledWith(mockCliente, 'email');
  });

  it('calls onOpenContactModal for whatsapp', () => {
    const onOpenContactModal = vi.fn();
    renderRow({ onOpenContactModal });
    fireEvent.click(screen.getByTitle('Enviar WhatsApp con plantilla'));
    expect(onOpenContactModal).toHaveBeenCalledWith(mockCliente, 'whatsapp');
  });

  it('disables email button when no email', () => {
    renderRow({
      cliente: { ...mockCliente, email: null },
    });
    const btn = screen.getByTitle('Sin email');
    expect(btn).toBeDisabled();
  });

  it('disables whatsapp button when no whatsapp', () => {
    renderRow({
      cliente: { ...mockCliente, whatsapp: null },
    });
    const btn = screen.getByTitle('Sin WhatsApp');
    expect(btn).toBeDisabled();
  });

  it('renders social media icons for available profiles', () => {
    renderRow();
    expect(screen.getByTitle('WhatsApp')).toBeInTheDocument();
    expect(screen.getByTitle('Instagram')).toBeInTheDocument();
    expect(screen.getByTitle('LinkedIn')).toBeInTheDocument();
    expect(screen.queryByTitle('Facebook')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Twitter')).not.toBeInTheDocument();
  });

  it('only renders active columns', () => {
    renderRow({ columnasActivas: ['nombre', 'estado'] });
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('NUEVO')).toBeInTheDocument();
    // These columns should not render
    expect(screen.queryByText('contact@acme.com')).not.toBeInTheDocument();
    expect(screen.queryByText('ALTA')).not.toBeInTheDocument();
  });

  it('renders address and city when available', () => {
    renderRow();
    expect(screen.getByText('Av. Corrientes 1234, Buenos Aires')).toBeInTheDocument();
  });

  it('renders website link with Globe icon', () => {
    renderRow();
    const link = screen.getByTitle('https://acme.com');
    expect(link).toHaveAttribute('href', 'https://acme.com');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
