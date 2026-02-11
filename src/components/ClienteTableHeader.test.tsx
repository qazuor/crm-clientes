import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClienteTableHeader } from './ClienteTableHeader';

describe('ClienteTableHeader', () => {
  const allColumns = [
    'nombre', 'contacto', 'estado', 'prioridad', 'industria',
    'ultimoContacto', 'ultimaIA', 'fechaCreacion', 'fechaModific',
    'sitioWeb', 'redesSociales', 'acciones',
  ];

  const defaultProps = {
    columnasActivas: allColumns,
    allPageSelected: false,
    sortField: 'nombre',
    sortOrder: 'asc',
    onToggleSelectAll: vi.fn(),
    createSortUrl: (field: string) => `/clientes?sort=${field}&order=asc`,
  };

  it('renders select-all checkbox', () => {
    render(
      <table><ClienteTableHeader {...defaultProps} /></table>,
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('reflects allPageSelected state', () => {
    render(
      <table><ClienteTableHeader {...defaultProps} allPageSelected={true} /></table>,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onToggleSelectAll when checkbox clicked', () => {
    const onToggleSelectAll = vi.fn();
    render(
      <table><ClienteTableHeader {...defaultProps} onToggleSelectAll={onToggleSelectAll} /></table>,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleSelectAll).toHaveBeenCalledOnce();
  });

  it('renders sortable column headers as links', () => {
    render(
      <table><ClienteTableHeader {...defaultProps} /></table>,
    );
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Contacto')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Prioridad')).toBeInTheDocument();
    expect(screen.getByText('Industria')).toBeInTheDocument();
  });

  it('renders non-sortable headers for redesSociales and acciones', () => {
    render(
      <table><ClienteTableHeader {...defaultProps} /></table>,
    );
    expect(screen.getByText('Redes')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  it('applies aria-sort ascending to sorted column', () => {
    render(
      <table><ClienteTableHeader {...defaultProps} sortField="nombre" sortOrder="asc" /></table>,
    );
    const header = screen.getByText('Cliente').closest('th');
    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });

  it('applies aria-sort descending to sorted column', () => {
    render(
      <table><ClienteTableHeader {...defaultProps} sortField="estado" sortOrder="desc" /></table>,
    );
    const header = screen.getByText('Estado').closest('th');
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('does not apply aria-sort to unsorted columns', () => {
    render(
      <table><ClienteTableHeader {...defaultProps} sortField="nombre" /></table>,
    );
    const estadoHeader = screen.getByText('Estado').closest('th');
    expect(estadoHeader).not.toHaveAttribute('aria-sort');
  });

  it('only renders columns that are in columnasActivas', () => {
    render(
      <table><ClienteTableHeader {...defaultProps} columnasActivas={['nombre', 'estado']} /></table>,
    );
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.queryByText('Contacto')).not.toBeInTheDocument();
    expect(screen.queryByText('Prioridad')).not.toBeInTheDocument();
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
  });

  it('renders all th elements with scope="col"', () => {
    const { container } = render(
      <table><ClienteTableHeader {...defaultProps} /></table>,
    );
    const ths = container.querySelectorAll('th');
    ths.forEach((th) => {
      expect(th).toHaveAttribute('scope', 'col');
    });
  });

  it('generates correct sort URLs via createSortUrl', () => {
    const createSortUrl = vi.fn((field: string) => `/clientes?sort=${field}`);
    render(
      <table><ClienteTableHeader {...defaultProps} createSortUrl={createSortUrl} /></table>,
    );
    // One call per sortable column
    expect(createSortUrl).toHaveBeenCalledWith('nombre');
    expect(createSortUrl).toHaveBeenCalledWith('email');
    expect(createSortUrl).toHaveBeenCalledWith('estado');
  });
});
