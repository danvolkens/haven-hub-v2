import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../utils/test-utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';

describe('Button', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      renderWithProviders(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders as button element', () => {
      renderWithProviders(<Button>Button</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies base classes', () => {
      renderWithProviders(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('inline-flex');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
      expect(button).toHaveClass('cursor-pointer');
    });
  });

  describe('Variants', () => {
    it('applies primary variant by default', () => {
      renderWithProviders(<Button>Primary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-sage');
      expect(button).toHaveClass('text-white');
    });

    it('applies secondary variant', () => {
      renderWithProviders(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('border-sage');
      expect(button).toHaveClass('text-sage');
      expect(button).toHaveClass('bg-transparent');
    });

    it('applies ghost variant', () => {
      renderWithProviders(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-charcoal');
    });

    it('applies destructive variant', () => {
      renderWithProviders(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error');
      expect(button).toHaveClass('text-white');
    });

    it('applies link variant', () => {
      renderWithProviders(<Button variant="link">Link</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-sage');
      expect(button).toHaveClass('underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('applies sm size', () => {
      renderWithProviders(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('text-body-sm');
    });

    it('applies md size by default', () => {
      renderWithProviders(<Button>Medium</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('px-4');
    });

    it('applies lg size', () => {
      renderWithProviders(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12');
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('text-body-lg');
    });

    it('applies icon size', () => {
      renderWithProviders(<Button size="icon"><Plus /></Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('w-10');
    });

    it('applies icon-sm size', () => {
      renderWithProviders(<Button size="icon-sm"><Plus /></Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8');
      expect(button).toHaveClass('w-8');
    });

    it('applies icon-lg size', () => {
      renderWithProviders(<Button size="icon-lg"><Plus /></Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12');
      expect(button).toHaveClass('w-12');
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styles', () => {
      renderWithProviders(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('has pointer-events-none when disabled', () => {
      renderWithProviders(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:pointer-events-none');
    });

    it('has opacity-50 when disabled', () => {
      renderWithProviders(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading', () => {
      renderWithProviders(<Button isLoading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      renderWithProviders(<Button isLoading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('still shows text when loading', () => {
      renderWithProviders(<Button isLoading>Save</Button>);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders left icon', () => {
      renderWithProviders(
        <Button leftIcon={<ArrowLeft data-testid="left-icon" />}>
          Back
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      renderWithProviders(
        <Button rightIcon={<ArrowRight data-testid="right-icon" />}>
          Next
        </Button>
      );

      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('renders both icons', () => {
      renderWithProviders(
        <Button
          leftIcon={<ArrowLeft data-testid="left-icon" />}
          rightIcon={<ArrowRight data-testid="right-icon" />}
        >
          Navigate
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('Click Handler', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithProviders(
        <Button onClick={handleClick}>Click</Button>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      renderWithProviders(
        <Button onClick={handleClick} disabled>Click</Button>
      );

      // Can't click disabled button with userEvent
      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', async () => {
      const handleClick = vi.fn();
      renderWithProviders(
        <Button onClick={handleClick} isLoading>Click</Button>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Button Type', () => {
    it('has type button by default', () => {
      renderWithProviders(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('type', 'submit');
    });

    it('accepts type prop', () => {
      renderWithProviders(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Custom className', () => {
    it('merges custom className', () => {
      renderWithProviders(<Button className="custom-class">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('inline-flex');
    });
  });

  describe('Accessibility', () => {
    it('can receive focus', () => {
      renderWithProviders(<Button>Focus me</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it('has focus visible ring classes', () => {
      renderWithProviders(<Button>Focus ring</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:outline-none');
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('supports aria-label', () => {
      renderWithProviders(
        <Button aria-label="Close dialog" size="icon">
          <Plus />
        </Button>
      );

      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    });
  });
});

describe('Button Variant Combinations', () => {
  it('combines variant and size', () => {
    renderWithProviders(
      <Button variant="secondary" size="lg">Combined</Button>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('h-12');
  });

  it('combines variant with loading state', () => {
    renderWithProviders(
      <Button variant="destructive" isLoading>Deleting</Button>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-error');
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
