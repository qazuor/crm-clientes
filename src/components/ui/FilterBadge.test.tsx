import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBadge, FilterBadgeGroup } from './FilterBadge';

describe('FilterBadge', () => {
  const defaultProps = {
    label: 'Estado',
    value: 'NUEVO',
    onRemove: vi.fn(),
  };

  it('renders label and value', () => {
    render(<FilterBadge {...defaultProps} />);
    expect(screen.getByText('Estado:')).toBeInTheDocument();
    expect(screen.getByText('NUEVO')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<FilterBadge {...defaultProps} onRemove={onRemove} />);

    const removeBtn = screen.getByLabelText('Eliminar filtro Estado');
    fireEvent.click(removeBtn);

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('has accessible remove button with aria-label', () => {
    render(<FilterBadge {...defaultProps} />);
    expect(screen.getByLabelText('Eliminar filtro Estado')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<FilterBadge {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('FilterBadgeGroup', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <FilterBadgeGroup count={0} onClearAll={vi.fn()}>
        <span>child</span>
      </FilterBadgeGroup>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders counter text for single filter', () => {
    render(
      <FilterBadgeGroup count={1} onClearAll={vi.fn()}>
        <span>badge</span>
      </FilterBadgeGroup>,
    );
    expect(screen.getByText('1 filtro activo:')).toBeInTheDocument();
  });

  it('renders plural counter text for multiple filters', () => {
    render(
      <FilterBadgeGroup count={3} onClearAll={vi.fn()}>
        <span>badges</span>
      </FilterBadgeGroup>,
    );
    expect(screen.getByText('3 filtros activos:')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FilterBadgeGroup count={1} onClearAll={vi.fn()}>
        <span data-testid="child">test child</span>
      </FilterBadgeGroup>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('calls onClearAll when clear button is clicked', () => {
    const onClearAll = vi.fn();
    render(
      <FilterBadgeGroup count={2} onClearAll={onClearAll}>
        <span>badges</span>
      </FilterBadgeGroup>,
    );

    fireEvent.click(screen.getByText('Limpiar todos'));
    expect(onClearAll).toHaveBeenCalledOnce();
  });
});
