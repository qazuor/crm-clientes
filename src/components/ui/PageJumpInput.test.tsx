import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageJumpInput } from './PageJumpInput';

describe('PageJumpInput', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: vi.fn(),
  };

  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <PageJumpInput currentPage={1} totalPages={1} onPageChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders input and label when totalPages > 1', () => {
    render(<PageJumpInput {...defaultProps} />);
    expect(screen.getByText('Ir a:')).toBeInTheDocument();
    expect(screen.getByLabelText(/Jump to page/)).toBeInTheDocument();
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });

  it('calls onPageChange with valid page on submit', () => {
    const onPageChange = vi.fn();
    render(<PageJumpInput {...defaultProps} onPageChange={onPageChange} />);

    const input = screen.getByLabelText(/Jump to page/);
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.submit(input);

    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it('does not call onPageChange for invalid page (0)', () => {
    const onPageChange = vi.fn();
    render(<PageJumpInput {...defaultProps} onPageChange={onPageChange} />);

    const input = screen.getByLabelText(/Jump to page/);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.submit(input);

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('does not call onPageChange for page exceeding totalPages', () => {
    const onPageChange = vi.fn();
    render(<PageJumpInput {...defaultProps} onPageChange={onPageChange} />);

    const input = screen.getByLabelText(/Jump to page/);
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.submit(input);

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('does not call onPageChange for non-numeric input', () => {
    const onPageChange = vi.fn();
    render(<PageJumpInput {...defaultProps} onPageChange={onPageChange} />);

    const input = screen.getByLabelText(/Jump to page/);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.submit(input);

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('clears input after successful submit', () => {
    const onPageChange = vi.fn();
    render(<PageJumpInput {...defaultProps} onPageChange={onPageChange} />);

    const input = screen.getByLabelText(/Jump to page/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.submit(input);

    expect(input.value).toBe('');
  });

  it('shows current page as placeholder', () => {
    render(<PageJumpInput {...defaultProps} currentPage={7} />);
    const input = screen.getByLabelText(/Jump to page/);
    expect(input).toHaveAttribute('placeholder', '7');
  });
});
