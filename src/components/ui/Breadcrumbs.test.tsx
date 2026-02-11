import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
  it('renders nav with aria-label', () => {
    render(<Breadcrumbs items={[{ label: 'Home' }]} />);
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
  });

  it('renders home link with Inicio aria-label', () => {
    render(<Breadcrumbs items={[{ label: 'Page' }]} />);
    const homeLink = screen.getByLabelText('Inicio');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.tagName).toBe('A');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders last item as text with aria-current="page"', () => {
    render(<Breadcrumbs items={[{ label: 'Current Page' }]} />);
    const current = screen.getByText('Current Page');
    expect(current.tagName).toBe('SPAN');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('renders intermediate items with links', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Clientes', href: '/clientes' },
          { label: 'Detail' },
        ]}
      />,
    );

    const link = screen.getByText('Clientes');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/clientes');
  });

  it('renders last item without link even if href provided', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Clientes', href: '/clientes' },
          { label: 'Detail', href: '/clientes/123' },
        ]}
      />,
    );

    const lastItem = screen.getByText('Detail');
    expect(lastItem.tagName).toBe('SPAN');
  });

  it('renders three-level breadcrumb correctly', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Clientes', href: '/clientes' },
          { label: 'Acme Corp', href: '/clientes/123' },
          { label: 'Editar' },
        ]}
      />,
    );

    expect(screen.getByText('Clientes').tagName).toBe('A');
    expect(screen.getByText('Acme Corp').tagName).toBe('A');
    expect(screen.getByText('Editar').tagName).toBe('SPAN');
  });

  it('applies custom className', () => {
    render(<Breadcrumbs items={[{ label: 'Test' }]} className="custom-class" />);
    const nav = screen.getByLabelText('Breadcrumb');
    expect(nav.className).toContain('custom-class');
  });
});
