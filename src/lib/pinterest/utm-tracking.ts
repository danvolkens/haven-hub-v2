/**
 * UTM Tracking for Pinterest Links
 *
 * Adds UTM parameters to destination links for tracking
 * pin → click → add to cart → purchase journey
 */

export interface UtmParams {
  source: string;      // pinterest
  medium: string;      // organic, paid_social
  campaign: string;    // collection name or campaign
  content?: string;    // pin ID or asset ID
  term?: string;       // quote collection, mood, etc.
}

export interface PinTrackingContext {
  pinId: string;
  collection?: string | null;
  quoteId?: string | null;
  mood?: string | null;
  copyVariant?: string | null;
}

/**
 * Build a URL with UTM parameters for tracking
 */
export function buildTrackedUrl(baseUrl: string, params: UtmParams): string {
  if (!baseUrl) return '';

  try {
    const url = new URL(baseUrl);

    url.searchParams.set('utm_source', params.source);
    url.searchParams.set('utm_medium', params.medium);
    url.searchParams.set('utm_campaign', params.campaign);

    if (params.content) {
      url.searchParams.set('utm_content', params.content);
    }

    if (params.term) {
      url.searchParams.set('utm_term', params.term);
    }

    return url.toString();
  } catch {
    // If URL parsing fails, append parameters manually
    const separator = baseUrl.includes('?') ? '&' : '?';
    const searchParams = new URLSearchParams();

    searchParams.set('utm_source', params.source);
    searchParams.set('utm_medium', params.medium);
    searchParams.set('utm_campaign', params.campaign);

    if (params.content) {
      searchParams.set('utm_content', params.content);
    }

    if (params.term) {
      searchParams.set('utm_term', params.term);
    }

    return `${baseUrl}${separator}${searchParams.toString()}`;
  }
}

/**
 * Build UTM parameters for organic Pinterest pins
 */
export function buildOrganicPinUtm(context: PinTrackingContext): UtmParams {
  // Campaign: collection name or 'general'
  const campaign = context.collection?.toLowerCase().replace(/\s+/g, '-') || 'general';

  // Content: pin ID for tracking individual pin performance
  const content = `pin-${context.pinId.slice(0, 8)}`;

  // Term: additional context (mood, variant) for segmentation
  const termParts: string[] = [];
  if (context.mood) termParts.push(context.mood);
  if (context.copyVariant) termParts.push(`v${context.copyVariant}`);
  const term = termParts.length > 0 ? termParts.join('-') : undefined;

  return {
    source: 'pinterest',
    medium: 'organic',
    campaign,
    content,
    term,
  };
}

/**
 * Build UTM parameters for paid Pinterest ads
 */
export function buildPaidPinUtm(
  campaignName: string,
  context: Partial<PinTrackingContext> & { adGroupId?: string }
): UtmParams {
  return {
    source: 'pinterest',
    medium: 'paid_social',
    campaign: campaignName.toLowerCase().replace(/\s+/g, '-'),
    content: context.pinId ? `pin-${context.pinId.slice(0, 8)}` : context.adGroupId,
    term: context.collection?.toLowerCase().replace(/\s+/g, '-'),
  };
}

/**
 * Add tracking to a pin's destination link
 */
export function addPinTracking(
  link: string | null | undefined,
  context: PinTrackingContext,
  isPaid: boolean = false,
  campaignName?: string
): string | null {
  if (!link) return null;

  const utmParams = isPaid && campaignName
    ? buildPaidPinUtm(campaignName, context)
    : buildOrganicPinUtm(context);

  return buildTrackedUrl(link, utmParams);
}
