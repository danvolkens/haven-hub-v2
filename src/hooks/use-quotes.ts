import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetcher';
import { useToast } from '@/components/providers/toast-provider';
import type { Quote } from '@/types/quotes';
import type { Collection, Mood } from '@/lib/constants';

interface QuotesQueryParams {
  collection?: Collection;
  mood?: Mood;
  status?: 'active' | 'archived' | 'generating';
  search?: string;
  limit?: number;
  offset?: number;
  sort?: 'created_at' | 'updated_at' | 'total_impressions';
  order?: 'asc' | 'desc';
}

interface QuotesResponse {
  quotes: Quote[];
  total: number;
  limit: number;
  offset: number;
}

export function useQuotes(params: QuotesQueryParams = {}) {
  return useQuery({
    queryKey: ['quotes', params],
    queryFn: () => api.get<QuotesResponse>('/quotes', params as Record<string, string | number | boolean | undefined>),
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: () => api.get<Quote & { assets: unknown[] }>(`/quotes/${id}`),
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      text: string;
      attribution?: string;
      collection: Collection;
      mood: Mood;
      temporal_tags?: string[];
      masterImage?: File;
    }) => {
      // First create the quote
      const quote = await api.post<Quote>('/quotes', {
        text: data.text,
        attribution: data.attribution,
        collection: data.collection,
        mood: data.mood,
        temporal_tags: data.temporal_tags,
      });

      // Then upload master image if provided
      if (data.masterImage) {
        const formData = new FormData();
        formData.append('image', data.masterImage);

        console.log('Uploading image for quote:', quote.id);

        const response = await fetch(`/api/quotes/${quote.id}/image`, {
          method: 'POST',
          body: formData,
          credentials: 'include', // Ensure cookies are sent
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to upload image');
        }

        const result = await response.json();
        return result.quote as Quote;
      }

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast('Quote created', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to create quote', 'error');
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Quote>) =>
      api.patch<Quote>(`/quotes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', variables.id] });
      toast('Quote updated', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to update quote', 'error');
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast('Quote deleted', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to delete quote', 'error');
    },
  });
}

export function useImportQuotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (quotes: Array<{
      text: string;
      attribution?: string;
      collection: Collection;
      mood: Mood;
      temporal_tags?: string[];
    }>) => api.post<{ inserted: number; errors: unknown[] }>('/quotes/import', { quotes }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast(`Imported ${data.inserted} quotes`, 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to import quotes', 'error');
    },
  });
}
