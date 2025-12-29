import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../../utils/test-utils';
import { Modal, ConfirmModal } from '@/components/ui/modal';

describe('Modal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(
        <Modal isOpen={false} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title when provided', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Title">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('renders description when provided', () => {
      renderWithProviders(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          title="Title"
          description="Test description"
        >
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'modal-description');
    });

    it('renders footer when provided', () => {
      renderWithProviders(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          footer={<button>Save</button>}
        >
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('renders close button by default', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} title="Title">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.queryByRole('button', { name: 'Close modal' })).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies sm size class', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} size="sm">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');
    });

    it('applies md size class by default', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toHaveClass('max-w-md');
    });

    it('applies lg size class', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} size="lg">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toHaveClass('max-w-lg');
    });

    it('applies xl size class', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} size="xl">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toHaveClass('max-w-xl');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} title="Title">
          <p>Content</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('closes on ESC key by default', async () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('does not close on ESC key when closeOnEsc is false', async () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} closeOnEsc={false}>
          <p>Content</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const { user } = renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} title="Title">
          <p>Content</p>
        </Modal>
      );

      await user.click(screen.getByRole('button', { name: 'Close modal' }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked by default', async () => {
      const { user } = renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </Modal>
      );

      // Click the overlay (aria-hidden element)
      const overlay = document.querySelector('[aria-hidden="true"]');
      if (overlay) {
        await user.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on overlay click when closeOnOverlayClick is false', async () => {
      const { user } = renderWithProviders(
        <Modal isOpen={true} onClose={mockOnClose} closeOnOverlayClick={false}>
          <p>Content</p>
        </Modal>
      );

      // Click the overlay
      const overlay = document.querySelector('[aria-hidden="true"]');
      if (overlay) {
        await user.click(overlay);
      }

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});

describe('ConfirmModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with title and message', () => {
    renderWithProviders(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
      />
    );

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    renderWithProviders(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm"
        message="Confirm?"
      />
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('uses custom button text', () => {
    renderWithProviders(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete"
        message="Delete this item?"
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const { user } = renderWithProviders(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm"
        message="Confirm?"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const { user } = renderWithProviders(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm"
        message="Confirm?"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when isLoading is true', () => {
    renderWithProviders(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm"
        message="Confirm?"
        isLoading={true}
      />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
