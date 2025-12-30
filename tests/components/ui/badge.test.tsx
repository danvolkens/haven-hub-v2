import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../utils/test-utils';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      renderWithProviders(<Badge>Badge text</Badge>);

      expect(screen.getByText('Badge text')).toBeInTheDocument();
    });

    it('renders as span element', () => {
      renderWithProviders(<Badge data-testid="badge">Text</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge.tagName).toBe('SPAN');
    });

    it('applies base classes', () => {
      renderWithProviders(<Badge data-testid="badge">Text</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('font-medium');
    });
  });

  describe('Variants', () => {
    it('applies default variant', () => {
      renderWithProviders(<Badge data-testid="badge">Default</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-elevated');
    });

    it('applies primary variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="primary">Primary</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-sage');
    });

    it('applies secondary variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="secondary">Secondary</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-sage-pale');
    });

    it('applies success variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="success">Success</Badge>);

      const badge = screen.getByTestId('badge');
      // Check for bg-success pattern (opacity modifier /10 may or may not be preserved in test env)
      expect(badge.className).toMatch(/bg-success/);
    });

    it('applies warning variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="warning">Warning</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge.className).toMatch(/bg-warning/);
    });

    it('applies error variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="error">Error</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge.className).toMatch(/bg-error/);
    });

    it('applies info variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="info">Info</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge.className).toMatch(/bg-info/);
    });

    it('applies outline variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="outline">Outline</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('bg-transparent');
    });
  });

  describe('Collection Variants', () => {
    it('applies grounding variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="grounding">Grounding</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-grounding');
    });

    it('applies wholeness variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="wholeness">Wholeness</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-wholeness');
    });

    it('applies growth variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="growth">Growth</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-growth');
    });
  });

  describe('Outline Variants', () => {
    it('applies outline-success variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="outline-success">Success</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('border-success');
      expect(badge).toHaveClass('bg-transparent');
    });

    it('applies outline-warning variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="outline-warning">Warning</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('border-warning');
      expect(badge).toHaveClass('bg-transparent');
    });

    it('applies outline-error variant', () => {
      renderWithProviders(<Badge data-testid="badge" variant="outline-error">Error</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('border-error');
      expect(badge).toHaveClass('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('applies sm size', () => {
      renderWithProviders(<Badge data-testid="badge" size="sm">Small</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('text-caption');
    });

    it('applies md size by default', () => {
      renderWithProviders(<Badge data-testid="badge">Medium</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('text-body-sm');
    });

    it('applies lg size', () => {
      renderWithProviders(<Badge data-testid="badge" size="lg">Large</Badge>);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-body');
    });
  });

  describe('Dot', () => {
    it('renders dot when dot prop is true', () => {
      renderWithProviders(<Badge dot>With dot</Badge>);

      const badge = screen.getByText('With dot');
      const dot = badge.querySelector('span.mr-1\\.5');
      expect(dot).toBeInTheDocument();
    });

    it('does not render dot by default', () => {
      renderWithProviders(<Badge data-testid="badge">No dot</Badge>);

      const badge = screen.getByTestId('badge');
      const dot = badge.querySelector('span.mr-1\\.5');
      expect(dot).not.toBeInTheDocument();
    });

    it('applies custom dot color', () => {
      renderWithProviders(<Badge dot dotColor="#ff0000">With color</Badge>);

      const badge = screen.getByText('With color');
      const dot = badge.querySelector('span.mr-1\\.5');
      expect(dot).toHaveStyle({ backgroundColor: '#ff0000' });
    });
  });

  describe('Icon', () => {
    it('renders icon when provided', () => {
      renderWithProviders(
        <Badge icon={<Star data-testid="icon" />}>With icon</Badge>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With icon')).toBeInTheDocument();
    });

    it('does not render icon wrapper when no icon', () => {
      renderWithProviders(<Badge data-testid="badge">No icon</Badge>);

      const badge = screen.getByTestId('badge');
      const iconWrapper = badge.querySelector('span.mr-1');
      expect(iconWrapper).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('merges custom className', () => {
      renderWithProviders(
        <Badge data-testid="badge" className="custom-badge">Custom</Badge>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('custom-badge');
      expect(badge).toHaveClass('inline-flex');
    });
  });
});

describe('Badge Variant Combinations', () => {
  it('can combine variant with size', () => {
    renderWithProviders(
      <Badge data-testid="badge" variant="primary" size="lg">Combined</Badge>
    );

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-sage');
    expect(badge).toHaveClass('text-body');
  });

  it('can combine variant with dot', () => {
    renderWithProviders(
      <Badge variant="success" dot>Status</Badge>
    );

    const badge = screen.getByText('Status');
    expect(badge.className).toMatch(/bg-success/);
    expect(badge.querySelector('span.mr-1\\.5')).toBeInTheDocument();
  });
});
