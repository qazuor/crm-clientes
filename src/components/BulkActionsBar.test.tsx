import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionsBar } from './BulkActionsBar';

describe('BulkActionsBar', () => {
  const defaultProps = {
    selectedCount: 3,
    onEnrich: vi.fn(),
    onContact: vi.fn(),
    onChangeEstado: vi.fn(),
    onChangePrioridad: vi.fn(),
    onDelete: vi.fn(),
    onClearSelection: vi.fn(),
  };

  it('displays selected count', () => {
    render(<BulkActionsBar {...defaultProps} />);
    expect(screen.getByText('3 cliente(s) seleccionado(s)')).toBeInTheDocument();
  });

  it('displays correct count for single selection', () => {
    render(<BulkActionsBar {...defaultProps} selectedCount={1} />);
    expect(screen.getByText('1 cliente(s) seleccionado(s)')).toBeInTheDocument();
  });

  it('renders all action buttons', () => {
    render(<BulkActionsBar {...defaultProps} />);
    expect(screen.getByText('Enriquecer')).toBeInTheDocument();
    expect(screen.getByText('Contactar')).toBeInTheDocument();
    expect(screen.getByText('Cambiar Estado')).toBeInTheDocument();
    expect(screen.getByText('Cambiar Prioridad')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
    expect(screen.getByText('Deseleccionar')).toBeInTheDocument();
  });

  it('calls onEnrich when Enriquecer clicked', () => {
    const onEnrich = vi.fn();
    render(<BulkActionsBar {...defaultProps} onEnrich={onEnrich} />);
    fireEvent.click(screen.getByText('Enriquecer'));
    expect(onEnrich).toHaveBeenCalledOnce();
  });

  it('calls onContact when Contactar clicked', () => {
    const onContact = vi.fn();
    render(<BulkActionsBar {...defaultProps} onContact={onContact} />);
    fireEvent.click(screen.getByText('Contactar'));
    expect(onContact).toHaveBeenCalledOnce();
  });

  it('calls onChangeEstado when Cambiar Estado clicked', () => {
    const onChangeEstado = vi.fn();
    render(<BulkActionsBar {...defaultProps} onChangeEstado={onChangeEstado} />);
    fireEvent.click(screen.getByText('Cambiar Estado'));
    expect(onChangeEstado).toHaveBeenCalledOnce();
  });

  it('calls onChangePrioridad when Cambiar Prioridad clicked', () => {
    const onChangePrioridad = vi.fn();
    render(<BulkActionsBar {...defaultProps} onChangePrioridad={onChangePrioridad} />);
    fireEvent.click(screen.getByText('Cambiar Prioridad'));
    expect(onChangePrioridad).toHaveBeenCalledOnce();
  });

  it('calls onDelete when Eliminar clicked', () => {
    const onDelete = vi.fn();
    render(<BulkActionsBar {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('calls onClearSelection when Deseleccionar clicked', () => {
    const onClearSelection = vi.fn();
    render(<BulkActionsBar {...defaultProps} onClearSelection={onClearSelection} />);
    fireEvent.click(screen.getByText('Deseleccionar'));
    expect(onClearSelection).toHaveBeenCalledOnce();
  });
});
