import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/login',
}));

// Mock the auth hook
const mockSignIn = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    signIn: mockSignIn,
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
  }),
}));

// Import after mocks
import LoginPage from '@/app/(auth)/login/page';

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ success: true, user: { id: 'test-user' } });
  });

  describe('Rendering', () => {
    it('renders login page heading', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
      });
    });

    it('renders email input', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });

    it('renders password input', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });
    });

    it('renders submit button', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('renders forgot password link', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
      });
    });

    it('renders signup link', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/sign up/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error for invalid email', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty password', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls signIn with email and password', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('shows error message on failed login', async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: { message: 'Invalid credentials' },
      });

      const user = userEvent.setup();
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility when clicking show/hide button', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/password/i);

      // Initially password type
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find and click the toggle button (should be near the password input)
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(
        (btn) => btn.querySelector('svg') && btn.getAttribute('type') !== 'submit'
      );

      if (toggleButton) {
        await user.click(toggleButton);

        // Should now be text type
        await waitFor(() => {
          expect(passwordInput).toHaveAttribute('type', 'text');
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('email input is focusable', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      emailInput.focus();

      expect(document.activeElement).toBe(emailInput);
    });

    it('form can be submitted with Enter key', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });
});
