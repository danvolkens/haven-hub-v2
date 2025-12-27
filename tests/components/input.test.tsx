import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders text input by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with value', () => {
      render(<Input value="test value" onChange={() => {}} />);
      expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
    });

    it('renders password input', () => {
      render(<Input type="password" data-testid="password-input" />);
      const input = screen.getByTestId('password-input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders email input', () => {
      render(<Input type="email" data-testid="email-input" />);
      const input = screen.getByTestId('email-input');
      expect(input).toHaveAttribute('type', 'email');
    });
  });

  describe('Icons', () => {
    it('renders with left icon', () => {
      render(<Input leftIcon={<span data-testid="left-icon">L</span>} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(<Input rightIcon={<span data-testid="right-icon">R</span>} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('right icon is clickable when onRightIconClick is provided', () => {
      const handleClick = vi.fn();
      render(
        <Input
          rightIcon={<span data-testid="right-icon">R</span>}
          onRightIconClick={handleClick}
        />
      );

      fireEvent.click(screen.getByTestId('right-icon').parentElement!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error State', () => {
    it('shows error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('sets aria-invalid when error exists', () => {
      render(<Input error="Error" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('aria-invalid', 'true');
    });

    it('has error role on error message', () => {
      render(<Input error="Error message" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });

    it('applies error styling', () => {
      render(<Input error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-error');
    });
  });

  describe('Helper Text', () => {
    it('shows helper text', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('hides helper text when error exists', () => {
      render(<Input helperText="Helper text" error="Error message" />);
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('can be disabled', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('has disabled styling', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('disabled:cursor-not-allowed');
    });
  });

  describe('Read Only State', () => {
    it('can be read only', () => {
      render(<Input readOnly />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
  });

  describe('Interactions', () => {
    it('calls onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'new value' },
      });

      expect(handleChange).toHaveBeenCalled();
    });

    it('calls onFocus when focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      fireEvent.focus(screen.getByRole('textbox'));

      expect(handleFocus).toHaveBeenCalled();
    });

    it('calls onBlur when blurred', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      fireEvent.blur(screen.getByRole('textbox'));

      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has aria-describedby for error', () => {
      render(<Input id="test-input" error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });

    it('has aria-describedby for helper text', () => {
      render(<Input id="test-input" helperText="Helper text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
    });

    it('generates unique id when not provided', () => {
      render(<Input error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('is focusable', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');

      input.focus();

      expect(document.activeElement).toBe(input);
    });

    it('accepts custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('custom-class');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = { current: null };
      render(<Input ref={ref} />);

      expect(ref.current).not.toBeNull();
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});
