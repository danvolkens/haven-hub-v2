import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../../utils/test-utils';
import { Select, type SelectOption } from '@/components/ui/select';

const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', description: 'With description' },
  { value: 'disabled', label: 'Disabled Option', disabled: true },
];

describe('Select', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with placeholder', () => {
      renderWithProviders(
        <Select options={mockOptions} placeholder="Choose an option" />
      );

      expect(screen.getByText('Choose an option')).toBeInTheDocument();
    });

    it('renders with selected value', () => {
      renderWithProviders(
        <Select options={mockOptions} value="option1" />
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('renders multiple selected values', () => {
      renderWithProviders(
        <Select
          options={mockOptions}
          value={['option1', 'option2']}
          multiple
        />
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('renders error message when provided', () => {
      renderWithProviders(
        <Select options={mockOptions} error="This field is required" />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies disabled state', () => {
      renderWithProviders(
        <Select options={mockOptions} disabled />
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-disabled', 'true');
      expect(combobox).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Dropdown Behavior', () => {
    it('opens dropdown on click', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} onChange={mockOnChange} />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const { user } = renderWithProviders(
        <div>
          <Select options={mockOptions} onChange={mockOnChange} />
          <button>Outside</button>
        </div>
      );

      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Outside' }));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('does not open when disabled', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} disabled />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('selects an option on click', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} onChange={mockOnChange} />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'Option 1' }));

      expect(mockOnChange).toHaveBeenCalledWith('option1');
    });

    it('closes dropdown after single selection', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} onChange={mockOnChange} />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'Option 1' }));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('keeps dropdown open for multiple selection', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} onChange={mockOnChange} multiple value={[]} />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'Option 1' }));

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('toggles selection in multiple mode', async () => {
      const { user } = renderWithProviders(
        <Select
          options={mockOptions}
          onChange={mockOnChange}
          multiple
          value={['option1']}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'Option 1' }));

      // Should deselect option1
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('does not select disabled options', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} onChange={mockOnChange} />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'Disabled Option' }));

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Clear Selection', () => {
    it('shows clear button when value is selected', () => {
      renderWithProviders(
        <Select options={mockOptions} value="option1" onChange={mockOnChange} />
      );

      expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
    });

    it('clears selection on clear button click', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} value="option1" onChange={mockOnChange} />
      );

      await user.click(screen.getByRole('button', { name: 'Clear selection' }));

      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('clears all selections in multiple mode', async () => {
      const { user } = renderWithProviders(
        <Select
          options={mockOptions}
          value={['option1', 'option2']}
          onChange={mockOnChange}
          multiple
        />
      );

      await user.click(screen.getByRole('button', { name: 'Clear selection' }));

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('removes individual value in multiple mode', async () => {
      const { user } = renderWithProviders(
        <Select
          options={mockOptions}
          value={['option1', 'option2']}
          onChange={mockOnChange}
          multiple
        />
      );

      await user.click(screen.getByRole('button', { name: 'Remove Option 1' }));

      expect(mockOnChange).toHaveBeenCalledWith(['option2']);
    });
  });

  describe('Search', () => {
    it('shows search input when searchable', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} searchable />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('filters options based on search query', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} searchable />
      );

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search...'), 'Option 1');

      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Option 2' })).not.toBeInTheDocument();
    });

    it('shows no options message when search has no results', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} searchable />
      );

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search...'), 'xyz');

      expect(screen.getByText('No options found')).toBeInTheDocument();
    });

    it('searches in description', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} searchable />
      );

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search...'), 'description');

      expect(screen.getByRole('option', { name: /Option 3/ })).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens dropdown on Enter key', async () => {
      renderWithProviders(
        <Select options={mockOptions} />
      );

      const combobox = screen.getByRole('combobox');
      combobox.focus();
      fireEvent.keyDown(combobox, { key: 'Enter' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown on Space key', async () => {
      renderWithProviders(
        <Select options={mockOptions} />
      );

      const combobox = screen.getByRole('combobox');
      combobox.focus();
      fireEvent.keyDown(combobox, { key: ' ' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown on ArrowDown', async () => {
      renderWithProviders(
        <Select options={mockOptions} />
      );

      const combobox = screen.getByRole('combobox');
      combobox.focus();
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes dropdown on Escape', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} />
      );

      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('navigates with arrow keys', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} onChange={mockOnChange} />
      );

      await user.click(screen.getByRole('combobox'));

      // Press down to highlight first option, then down again
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });

      // Press Enter to select
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

      // Should have selected option2 (second item after navigating down twice from initial -1)
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderWithProviders(
        <Select options={mockOptions} />
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('updates aria-expanded when open', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} />
      );

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });

    it('marks selected option with aria-selected', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} value="option1" />
      );

      await user.click(screen.getByRole('combobox'));

      const selectedOption = screen.getByRole('option', { name: 'Option 1' });
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });

    it('marks disabled option with aria-disabled', async () => {
      const { user } = renderWithProviders(
        <Select options={mockOptions} />
      );

      await user.click(screen.getByRole('combobox'));

      const disabledOption = screen.getByRole('option', { name: 'Disabled Option' });
      expect(disabledOption).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
