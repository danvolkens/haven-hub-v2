import { DM_CONFIG } from './config';

interface RenderRequest {
  template_id: string;
  layers: Array<{
    name: string;
    image_url: string;
    fit?: 'contain' | 'cover' | 'fill';
    position?: { x: number; y: number };
    size?: { width: number; height: number };
  }>;
  output?: {
    format?: 'png' | 'jpg';
    quality?: number;
    width?: number;
    height?: number;
  };
}

interface RenderResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_url?: string;
  thumbnail_url?: string;
  error?: string;
  credits_used: number;
  created_at: string;
  completed_at?: string;
}

interface MockupInfo {
  uuid: string;
  name: string;
  thumbnail: string;
  smart_objects: Array<{
    uuid: string;
    name: string;
    width: number;
    height: number;
  }>;
  text_layers: Array<{
    uuid: string;
    name: string;
  }>;
  collections: Array<{
    uuid: string;
    name: string;
  }>;
  thumbnails: Array<{ width: number; url: string }>;
}

// Legacy alias for compatibility
type TemplateInfo = MockupInfo;

export class DynamicMockupsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || DM_CONFIG.apiKey;
    this.baseUrl = DM_CONFIG.baseUrl;

    if (!this.apiKey) {
      throw new Error('Dynamic Mockups API key not configured');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DM_CONFIG.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': this.apiKey,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new DynamicMockupsError(
          error.message || `API error: ${response.status}`,
          response.status,
          error.code
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DynamicMockupsError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DynamicMockupsError('Request timed out', 408, 'TIMEOUT');
      }

      throw new DynamicMockupsError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        'UNKNOWN'
      );
    }
  }

  /**
   * Create a new render job
   */
  async createRender(request: RenderRequest): Promise<RenderResponse> {
    return this.request('/renders', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get render status and result
   */
  async getRender(renderId: string): Promise<RenderResponse> {
    return this.request(`/renders/${renderId}`);
  }

  /**
   * Wait for render to complete (with polling)
   */
  async waitForRender(
    renderId: string,
    options?: {
      maxWaitMs?: number;
      pollIntervalMs?: number;
    }
  ): Promise<RenderResponse> {
    const maxWait = options?.maxWaitMs || 120000;
    const pollInterval = options?.pollIntervalMs || 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const render = await this.getRender(renderId);

      if (render.status === 'completed') {
        return render;
      }

      if (render.status === 'failed') {
        throw new DynamicMockupsError(
          render.error || 'Render failed',
          500,
          'RENDER_FAILED'
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new DynamicMockupsError('Render timed out', 408, 'RENDER_TIMEOUT');
  }

  /**
   * Create render and wait for completion
   */
  async renderAndWait(request: RenderRequest): Promise<RenderResponse> {
    const render = await this.createRender(request);
    return this.waitForRender(render.id);
  }

  /**
   * Get template information
   */
  async getTemplate(templateId: string): Promise<TemplateInfo> {
    return this.request(`/templates/${templateId}`);
  }

  /**
   * List available mockups (templates)
   */
  async listMockups(params?: {
    collection_uuid?: string;
    catalog_uuid?: string;
    name?: string;
    include_all_catalogs?: boolean;
  }): Promise<{ data: MockupInfo[]; success: boolean; message: string }> {
    const query = new URLSearchParams();
    if (params?.collection_uuid) query.set('collection_uuid', params.collection_uuid);
    if (params?.catalog_uuid) query.set('catalog_uuid', params.catalog_uuid);
    if (params?.name) query.set('name', params.name);
    if (params?.include_all_catalogs) query.set('include_all_catalogs', 'true');
    return this.request(`/mockups?${query}`);
  }

  /**
   * List available templates (alias for listMockups)
   */
  async listTemplates(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<{ templates: MockupInfo[]; total: number }> {
    // Use the new mockups endpoint and transform response
    const response = await this.listMockups({ include_all_catalogs: true });
    return {
      templates: response.data || [],
      total: response.data?.length || 0,
    };
  }

  /**
   * Get account credits
   */
  async getCredits(): Promise<{ remaining: number; total: number }> {
    return this.request('/account/credits');
  }

  /**
   * List collections
   */
  async listCollections(params?: {
    catalog_uuid?: string;
    include_all_catalogs?: boolean;
  }): Promise<{ collections: CollectionInfo[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.catalog_uuid) query.set('catalog_uuid', params.catalog_uuid);
    if (params?.include_all_catalogs) query.set('include_all_catalogs', 'true');

    const response = await this.request<{ data: any[]; success: boolean; message: string }>(`/collections?${query}`);

    // Transform API response to our format
    const collections: CollectionInfo[] = (response.data || []).map((c: any) => ({
      id: c.uuid,
      name: c.name,
      description: c.description,
      preview_url: c.thumbnail,
      template_count: c.mockup_count || 0,
    }));

    return { collections, total: collections.length };
  }

  /**
   * Get mockups from a collection
   */
  async getCollectionMockups(collectionUuid: string): Promise<CollectionDetail> {
    // Include all catalogs to find mockups in non-default catalogs
    const response = await this.listMockups({
      collection_uuid: collectionUuid,
      include_all_catalogs: true,
    });

    return {
      id: collectionUuid,
      name: '', // Will be filled by caller if needed
      template_count: response.data?.length || 0,
      templates: (response.data || []).map((m: any) => ({
        uuid: m.uuid,
        name: m.name,
        thumbnail: m.thumbnail,
        smart_objects: m.smart_objects || [],
        text_layers: m.text_layers || [],
        collections: m.collections || [],
        thumbnails: m.thumbnails || [],
      })),
    };
  }

  /**
   * Get collection details with its templates (legacy method)
   */
  async getCollection(collectionId: string): Promise<CollectionDetail> {
    return this.getCollectionMockups(collectionId);
  }
}

export interface CollectionInfo {
  id: string;
  name: string;
  description?: string;
  preview_url?: string;
  template_count: number;
}

export interface CollectionDetail extends CollectionInfo {
  templates: MockupInfo[];
}

export class DynamicMockupsError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'DynamicMockupsError';
    this.status = status;
    this.code = code;
  }
}

// Singleton instance
let clientInstance: DynamicMockupsClient | null = null;

export function getDynamicMockupsClient(): DynamicMockupsClient {
  if (!clientInstance) {
    clientInstance = new DynamicMockupsClient();
  }
  return clientInstance;
}
