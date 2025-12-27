import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PerformanceRulesPage from '@/app/(dashboard)/dashboard/pinterest/settings/performance-rules/page';

// Mock global fetch
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const mockRules = [
    {
        id: '1',
        name: 'Scale High Performers',
        description: 'Increase budget for good CPA',
        metric: 'cpa',
        comparison: 'less_than',
        threshold_value: 10,
        action_type: 'increase_budget',
        action_config: { percentage: 20 },
        is_active: true,
        min_spend: 50,
        priority: 1
    },
    {
        id: '2',
        name: 'Pause Underperformers',
        description: 'Stop bad ads',
        metric: 'roas',
        comparison: 'less_than',
        threshold_value: 1,
        action_type: 'pause',
        action_config: {},
        is_active: false,
        min_spend: 100,
        priority: 2
    }
];

describe('PerformanceRulesPage', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders loading state or content initially', async () => {
        // Return a promise that never resolves to keep it in loading state for this test
        fetchMock.mockImplementationOnce(() => new Promise(() => { }));

        render(<PerformanceRulesPage />);

        // Component should show either loading state or the heading
        // Different implementations may show different loading indicators
        const hasLoadingOrHeading =
            screen.queryByText(/loading/i) ||
            screen.queryByText(/Performance Rules/i) ||
            screen.queryByRole('progressbar');

        expect(hasLoadingOrHeading).toBeTruthy();
    });

    it('renders rules after fetching', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ rules: mockRules })
        });

        render(<PerformanceRulesPage />);

        // Use findBy which waits automatically
        expect(await screen.findByText('Performance Rules')).toBeTruthy();
        expect(screen.getByText('Scale High Performers')).toBeTruthy();
        expect(screen.getByText('Pause Underperformers')).toBeTruthy();
        // Verify that the rules are present in the document
        expect(screen.getAllByRole('switch').length).toBeGreaterThan(0);
    });

    it('toggles rule status when switch is clicked', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ rules: mockRules })
        });

        render(<PerformanceRulesPage />);

        await screen.findByText('Performance Rules');

        // Mock successful toggle response for subsequent calls
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

        // Find the toggle switches
        const switches = screen.getAllByRole('switch');
        // First rule (id: 1) is Active. Switch should be checked.
        const firstSwitch = switches[0] as HTMLInputElement;
        expect(firstSwitch.checked).toBe(true);

        fireEvent.click(firstSwitch);

        // Wait for the PUT call to be made
        await waitFor(() => {
            const putCalls = fetchMock.mock.calls.filter(
                (call: [string, RequestInit?]) => call[1]?.method === 'PUT'
            );
            expect(putCalls.length).toBeGreaterThan(0);
        }, { timeout: 2000 });
    });
});
