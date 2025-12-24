'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Popup, PopupStatus } from '@/types/popups';

export function usePopups(status?: PopupStatus) {
  return useQuery({
    queryKey: ['popups', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);

      const response = await fetch(`/api/popups?${params}`);
      if (!response.ok) throw new Error('Failed to fetch popups');
      const data = await response.json();
      return data.popups as Popup[];
    },
  });
}

export function usePopup(id: string) {
  return useQuery({
    queryKey: ['popup', id],
    queryFn: async () => {
      const response = await fetch(`/api/popups/${id}`);
      if (!response.ok) throw new Error('Failed to fetch popup');
      const data = await response.json();
      return data.popup as Popup;
    },
    enabled: !!id,
  });
}

export function useCreatePopup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Popup>) => {
      const response = await fetch('/api/popups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create popup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
    },
  });
}

export function useUpdatePopup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Popup> }) => {
      const response = await fetch(`/api/popups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update popup');
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
      queryClient.invalidateQueries({ queryKey: ['popup', id] });
    },
  });
}

export function useDeletePopup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/popups/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete popup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
    },
  });
}
