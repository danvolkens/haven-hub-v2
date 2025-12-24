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

interface TemplateInfo {
  id: string;
  name: string;
  preview_url: string;
  layers: Array<{
    name: string;
    type: 'image' | 'text' | 'shape';
    is_smart_object: boolean;
    default_size: { width: number; height: number };
  }>;
}

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
          'Authorization': `Bearer ${this.apiKey}`,
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
   * List available templates
   */
  async listTemplates(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<{ templates: TemplateInfo[]; total: number }> {
    const query = new URLSearchParams(params as Record<string, string>);
    return this.request(`/templates?${query}`);
  }

  /**
   * Get account credits
   */
  async getCredits(): Promise<{ remaining: number; total: number }> {
    return this.request('/account/credits');
  }
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
