/**
 * Klaviyo API Client
 * Provides methods for interacting with the Klaviyo API
 */

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api';
const KLAVIYO_REVISION = '2024-02-15';

interface KlaviyoClientOptions {
  apiKey: string;
}

interface KlaviyoProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  properties?: Record<string, any>;
}

interface KlaviyoList {
  id: string;
  name: string;
  opt_in_process: string;
  created: string;
  updated: string;
}

interface KlaviyoEvent {
  metric: { name: string };
  profile: { email: string } | { id: string };
  properties?: Record<string, any>;
  time?: string;
  value?: number;
  unique_id?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  links?: {
    next?: string;
    prev?: string;
  };
}

export class KlaviyoClient {
  private apiKey: string;

  constructor(options: KlaviyoClientOptions) {
    this.apiKey = options.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${KLAVIYO_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
        'revision': KLAVIYO_REVISION,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.errors?.[0]?.detail || error.message || `Klaviyo API error: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ============================================================================
  // Account
  // ============================================================================

  async getAccount(): Promise<any> {
    const response = await this.request<{ data: any[] }>('/accounts/');
    return response.data?.[0];
  }

  // ============================================================================
  // Lists
  // ============================================================================

  async getLists(): Promise<KlaviyoList[]> {
    const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>('/lists/');
    return response.data.map(item => ({
      id: item.id,
      ...item.attributes,
    }));
  }

  async getList(listId: string): Promise<KlaviyoList | null> {
    try {
      const response = await this.request<{ data: { id: string; attributes: any } }>(`/lists/${listId}/`);
      return { id: response.data.id, ...response.data.attributes };
    } catch {
      return null;
    }
  }

  async createList(name: string): Promise<KlaviyoList> {
    const response = await this.request<{ data: { id: string; attributes: any } }>('/lists/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'list',
          attributes: { name },
        },
      }),
    });
    return { id: response.data.id, ...response.data.attributes };
  }

  async addProfilesToList(listId: string, profileIds: string[]): Promise<void> {
    await this.request(`/lists/${listId}/relationships/profiles/`, {
      method: 'POST',
      body: JSON.stringify({
        data: profileIds.map(id => ({ type: 'profile', id })),
      }),
    });
  }

  async removeProfilesFromList(listId: string, profileIds: string[]): Promise<void> {
    await this.request(`/lists/${listId}/relationships/profiles/`, {
      method: 'DELETE',
      body: JSON.stringify({
        data: profileIds.map(id => ({ type: 'profile', id })),
      }),
    });
  }

  // ============================================================================
  // Profiles
  // ============================================================================

  async createProfile(profile: Omit<KlaviyoProfile, 'id'>): Promise<KlaviyoProfile> {
    const response = await this.request<{ data: { id: string; attributes: any } }>('/profiles/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone_number: profile.phone_number,
            properties: profile.properties,
          },
        },
      }),
    });

    return { id: response.data.id, ...response.data.attributes };
  }

  async getProfileByEmail(email: string): Promise<KlaviyoProfile | null> {
    try {
      const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>(
        `/profiles/?filter=equals(email,"${encodeURIComponent(email)}")`
      );
      if (response.data.length === 0) return null;
      return { id: response.data[0].id, ...response.data[0].attributes };
    } catch {
      return null;
    }
  }

  async getProfile(profileId: string): Promise<KlaviyoProfile | null> {
    try {
      const response = await this.request<{ data: { id: string; attributes: any } }>(`/profiles/${profileId}/`);
      return { id: response.data.id, ...response.data.attributes };
    } catch {
      return null;
    }
  }

  async updateProfile(profileId: string, attributes: Partial<KlaviyoProfile>): Promise<KlaviyoProfile> {
    const response = await this.request<{ data: { id: string; attributes: any } }>(`/profiles/${profileId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'profile',
          id: profileId,
          attributes,
        },
      }),
    });

    return { id: response.data.id, ...response.data.attributes };
  }

  async createOrUpdateProfile(profile: Omit<KlaviyoProfile, 'id'>): Promise<KlaviyoProfile> {
    // Try to find existing profile
    const existing = await this.getProfileByEmail(profile.email);

    if (existing) {
      return this.updateProfile(existing.id, profile);
    }

    return this.createProfile(profile);
  }

  // ============================================================================
  // Events
  // ============================================================================

  async createEvent(event: KlaviyoEvent): Promise<void> {
    await this.request('/events/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'event',
          attributes: {
            metric: event.metric,
            profile: event.profile,
            properties: event.properties,
            time: event.time || new Date().toISOString(),
            value: event.value,
            unique_id: event.unique_id,
          },
        },
      }),
    });
  }

  async trackQuizComplete(
    email: string,
    quizResults: Record<string, any>,
    recommendedCollection: string
  ): Promise<void> {
    await this.createEvent({
      metric: { name: 'Quiz Completed' },
      profile: { email },
      properties: {
        quiz_results: quizResults,
        recommended_collection: recommendedCollection,
        quiz_completed_at: new Date().toISOString(),
      },
    });
  }

  async trackPurchase(
    email: string,
    orderId: string,
    value: number,
    items: Array<{ name: string; quantity: number; price: number }>
  ): Promise<void> {
    await this.createEvent({
      metric: { name: 'Placed Order' },
      profile: { email },
      properties: {
        order_id: orderId,
        items,
        item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      },
      value,
      unique_id: orderId,
    });
  }

  async trackCartAbandonment(
    email: string,
    cartId: string,
    items: Array<{ name: string; quantity: number; price: number }>,
    cartValue: number
  ): Promise<void> {
    await this.createEvent({
      metric: { name: 'Cart Abandoned' },
      profile: { email },
      properties: {
        cart_id: cartId,
        items,
        cart_value: cartValue,
        abandoned_at: new Date().toISOString(),
      },
      unique_id: `cart_${cartId}`,
    });
  }

  async trackPinEngagement(
    email: string,
    pinId: string,
    action: 'view' | 'save' | 'click',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.createEvent({
      metric: { name: `Pin ${action.charAt(0).toUpperCase() + action.slice(1)}` },
      profile: { email },
      properties: {
        pin_id: pinId,
        action,
        ...metadata,
      },
    });
  }

  // ============================================================================
  // Tags
  // ============================================================================

  async getTags(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.request<PaginatedResponse<{ id: string; attributes: { name: string } }>>('/tags/');
    return response.data.map(tag => ({
      id: tag.id,
      name: tag.attributes.name,
    }));
  }

  async getOrCreateTag(tagName: string): Promise<string> {
    // Check if tag exists
    const tags = await this.getTags();
    const existing = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

    if (existing) {
      return existing.id;
    }

    // Create new tag
    const response = await this.request<{ data: { id: string } }>('/tags/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'tag',
          attributes: { name: tagName },
        },
      }),
    });

    return response.data.id;
  }

  async addTagToProfile(profileId: string, tagId: string): Promise<void> {
    await this.request(`/tags/${tagId}/relationships/profiles/`, {
      method: 'POST',
      body: JSON.stringify({
        data: [{ type: 'profile', id: profileId }],
      }),
    });
  }

  async tagProfileByName(profileId: string, tagName: string): Promise<void> {
    const tagId = await this.getOrCreateTag(tagName);
    await this.addTagToProfile(profileId, tagId);
  }

  // ============================================================================
  // Segments
  // ============================================================================

  async getSegments(): Promise<Array<{ id: string; name: string; created: string }>> {
    const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>('/segments/');
    return response.data.map(seg => ({
      id: seg.id,
      name: seg.attributes.name,
      created: seg.attributes.created,
    }));
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  async getMetrics(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.request<PaginatedResponse<{ id: string; attributes: { name: string } }>>('/metrics/');
    return response.data.map(metric => ({
      id: metric.id,
      name: metric.attributes.name,
    }));
  }
}
