import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../utils/test-utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import React from 'react';

// Controlled Tabs wrapper for testing
function TestTabs({ defaultValue = 'tab1', onValueChange = vi.fn() }) {
  const [value, setValue] = React.useState(defaultValue);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onValueChange(newValue);
  };

  return (
    <Tabs value={value} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3" disabled>Tab 3 (Disabled)</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content for Tab 1</TabsContent>
      <TabsContent value="tab2">Content for Tab 2</TabsContent>
      <TabsContent value="tab3">Content for Tab 3</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  describe('Rendering', () => {
    it('renders tabs with correct structure', () => {
      renderWithProviders(<TestTabs />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('renders only the active tab content', () => {
      renderWithProviders(<TestTabs defaultValue="tab1" />);

      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument();
      expect(screen.queryByText('Content for Tab 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content for Tab 3')).not.toBeInTheDocument();
    });

    it('renders the correct active tab content based on value', () => {
      renderWithProviders(<TestTabs defaultValue="tab2" />);

      expect(screen.queryByText('Content for Tab 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument();
    });
  });

  describe('Tab Selection', () => {
    it('changes active tab on click', async () => {
      const mockOnChange = vi.fn();
      const { user } = renderWithProviders(<TestTabs onValueChange={mockOnChange} />);

      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));

      expect(mockOnChange).toHaveBeenCalledWith('tab2');
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument();
    });

    it('does not change to disabled tab on click', async () => {
      const mockOnChange = vi.fn();
      const { user } = renderWithProviders(<TestTabs onValueChange={mockOnChange} />);

      await user.click(screen.getByRole('tab', { name: 'Tab 3 (Disabled)' }));

      expect(mockOnChange).not.toHaveBeenCalledWith('tab3');
      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes on tabs', () => {
      renderWithProviders(<TestTabs defaultValue="tab1" />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab1).toHaveAttribute('aria-controls', 'tabpanel-tab1');
    });

    it('has correct ARIA attributes on tab panel', () => {
      renderWithProviders(<TestTabs defaultValue="tab1" />);

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', 'tab-tab1');
      expect(panel).toHaveAttribute('id', 'tabpanel-tab1');
    });

    it('disabled tab has correct attributes', () => {
      renderWithProviders(<TestTabs />);

      const disabledTab = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' });
      expect(disabledTab).toBeDisabled();
    });

    it('tab panel is focusable', () => {
      renderWithProviders(<TestTabs />);

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Styling', () => {
    it('applies active styling to selected tab', async () => {
      const { user } = renderWithProviders(<TestTabs />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveClass('bg-surface');

      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveClass('bg-surface');
    });

    it('applies custom className to Tabs container', () => {
      renderWithProviders(
        <Tabs value="tab1" onValueChange={vi.fn()} className="custom-tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );

      expect(document.querySelector('.custom-tabs')).toBeInTheDocument();
    });

    it('applies custom className to TabsList', () => {
      renderWithProviders(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tablist')).toHaveClass('custom-list');
    });

    it('applies custom className to TabsTrigger', () => {
      renderWithProviders(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">Tab</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tab')).toHaveClass('custom-trigger');
    });

    it('applies custom className to TabsContent', () => {
      renderWithProviders(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1">Tab</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">Content</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toHaveClass('custom-content');
    });
  });
});

describe('Tabs Context', () => {
  it('throws error when used outside of Tabs provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderWithProviders(<TabsTrigger value="test">Test</TabsTrigger>);
    }).toThrow('Tabs components must be used within a Tabs provider');

    consoleSpy.mockRestore();
  });
});

describe('Multiple Tab Groups', () => {
  it('renders multiple independent tab groups', async () => {
    const mockOnChange1 = vi.fn();
    const mockOnChange2 = vi.fn();

    function MultiTabsTest() {
      const [value1, setValue1] = React.useState('a1');
      const [value2, setValue2] = React.useState('b1');

      return (
        <div>
          <Tabs value={value1} onValueChange={(v) => { setValue1(v); mockOnChange1(v); }}>
            <TabsList>
              <TabsTrigger value="a1">Group A Tab 1</TabsTrigger>
              <TabsTrigger value="a2">Group A Tab 2</TabsTrigger>
            </TabsList>
            <TabsContent value="a1">Group A Content 1</TabsContent>
            <TabsContent value="a2">Group A Content 2</TabsContent>
          </Tabs>

          <Tabs value={value2} onValueChange={(v) => { setValue2(v); mockOnChange2(v); }}>
            <TabsList>
              <TabsTrigger value="b1">Group B Tab 1</TabsTrigger>
              <TabsTrigger value="b2">Group B Tab 2</TabsTrigger>
            </TabsList>
            <TabsContent value="b1">Group B Content 1</TabsContent>
            <TabsContent value="b2">Group B Content 2</TabsContent>
          </Tabs>
        </div>
      );
    }

    const { user } = renderWithProviders(<MultiTabsTest />);

    // Initial state
    expect(screen.getByText('Group A Content 1')).toBeInTheDocument();
    expect(screen.getByText('Group B Content 1')).toBeInTheDocument();

    // Change first group
    await user.click(screen.getByRole('tab', { name: 'Group A Tab 2' }));
    expect(mockOnChange1).toHaveBeenCalledWith('a2');
    expect(mockOnChange2).not.toHaveBeenCalled();

    // Verify both groups are independent
    expect(screen.getByText('Group A Content 2')).toBeInTheDocument();
    expect(screen.getByText('Group B Content 1')).toBeInTheDocument();
  });
});
