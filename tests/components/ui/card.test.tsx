import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../utils/test-utils';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

describe('Card', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      renderWithProviders(
        <Card>
          <p>Card content</p>
        </Card>
      );

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies default variant classes', () => {
      renderWithProviders(
        <Card data-testid="card">Default card</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('bg-surface');
      expect(card).toHaveClass('shadow-elevation-1');
    });

    it('applies elevated variant classes', () => {
      renderWithProviders(
        <Card data-testid="card" variant="elevated">Elevated card</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-surface');
      expect(card).toHaveClass('shadow-elevation-2');
    });

    it('applies bordered variant classes', () => {
      renderWithProviders(
        <Card data-testid="card" variant="bordered">Bordered card</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('bg-surface');
    });

    it('applies rounded-lg class', () => {
      renderWithProviders(
        <Card data-testid="card">Card</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg');
    });
  });

  describe('Padding', () => {
    it('applies no padding with padding="none"', () => {
      renderWithProviders(
        <Card data-testid="card" padding="none">No padding</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('p-3');
      expect(card).not.toHaveClass('p-4');
      expect(card).not.toHaveClass('p-6');
    });

    it('applies sm padding', () => {
      renderWithProviders(
        <Card data-testid="card" padding="sm">Small padding</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('p-3');
    });

    it('applies md padding by default', () => {
      renderWithProviders(
        <Card data-testid="card">Medium padding</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('p-4');
    });

    it('applies lg padding', () => {
      renderWithProviders(
        <Card data-testid="card" padding="lg">Large padding</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('p-6');
    });
  });

  describe('Hoverable', () => {
    it('applies hover styles when hoverable', () => {
      renderWithProviders(
        <Card data-testid="card" hoverable>Hoverable card</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('transition-shadow');
    });

    it('does not apply hover styles by default', () => {
      renderWithProviders(
        <Card data-testid="card">Non-hoverable card</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Custom className', () => {
    it('merges custom className', () => {
      renderWithProviders(
        <Card data-testid="card" className="custom-class">Card</Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-lg');
    });
  });
});

describe('CardHeader', () => {
  it('renders title when provided', () => {
    renderWithProviders(
      <Card>
        <CardHeader title="Card Title" />
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderWithProviders(
      <Card>
        <CardHeader title="Title" description="Card description" />
      </Card>
    );

    expect(screen.getByText('Card description')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    renderWithProviders(
      <Card>
        <CardHeader title="Title" action={<button>Action</button>} />
      </Card>
    );

    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders children instead of title/description when provided', () => {
    renderWithProviders(
      <Card>
        <CardHeader>
          <p>Custom header content</p>
        </CardHeader>
      </Card>
    );

    expect(screen.getByText('Custom header content')).toBeInTheDocument();
  });

  it('applies flex layout', () => {
    renderWithProviders(
      <Card>
        <CardHeader data-testid="header" title="Title" />
      </Card>
    );

    const header = screen.getByTestId('header');
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('items-start');
    expect(header).toHaveClass('justify-between');
  });

  it('applies custom className', () => {
    renderWithProviders(
      <Card>
        <CardHeader data-testid="header" title="Title" className="custom-header" />
      </Card>
    );

    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-header');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    renderWithProviders(
      <Card>
        <CardContent>
          <p>Content text</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByText('Content text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithProviders(
      <Card>
        <CardContent data-testid="content" className="custom-content">
          Content
        </CardContent>
      </Card>
    );

    const content = screen.getByTestId('content');
    expect(content).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    renderWithProviders(
      <Card>
        <CardFooter>
          <button>Cancel</button>
          <button>Save</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('applies flex layout with justify-end', () => {
    renderWithProviders(
      <Card>
        <CardFooter data-testid="footer">
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('flex');
    expect(footer).toHaveClass('items-center');
    expect(footer).toHaveClass('justify-end');
  });

  it('applies border-t and padding', () => {
    renderWithProviders(
      <Card>
        <CardFooter data-testid="footer">
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('pt-4');
  });

  it('applies custom className', () => {
    renderWithProviders(
      <Card>
        <CardFooter data-testid="footer" className="custom-footer">
          Footer
        </CardFooter>
      </Card>
    );

    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('custom-footer');
  });
});

describe('Card Composition', () => {
  it('renders complete card with all sections', () => {
    renderWithProviders(
      <Card>
        <CardHeader title="Title" description="Description" />
        <CardContent>Main content here</CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Main content here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
