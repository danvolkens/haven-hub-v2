import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { syncLeadToKlaviyo } from '@/lib/integrations/klaviyo/lead-sync';
import type { Lead, FormSubmission, CreateLandingPageRequest, LandingPage } from '@/types/leads';

interface LeadCaptureResult {
  success: boolean;
  lead?: Lead;
  error?: string;
}

export async function createLandingPage(
  userId: string,
  request: CreateLandingPageRequest
): Promise<{ success: boolean; page?: LandingPage; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    // Validate slug uniqueness
    const { data: existing } = await (supabase as any)
      .from('landing_pages')
      .select('id')
      .eq('user_id', userId)
      .eq('slug', request.slug)
      .single();

    if (existing) {
      return { success: false, error: 'Slug already exists' };
    }

    const { data: page, error } = await (supabase as any)
      .from('landing_pages')
      .insert({
        user_id: userId,
        slug: request.slug,
        name: request.name,
        type: request.type,
        headline: request.headline,
        subheadline: request.subheadline,
        body_content: request.bodyContent,
        lead_magnet_type: request.leadMagnetType,
        lead_magnet_title: request.leadMagnetTitle,
        collection: request.collection,
        featured_image_url: request.featuredImageUrl,
        meta_title: request.metaTitle,
        meta_description: request.metaDescription,
        form_fields: request.formFields || [
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'first_name', type: 'text', label: 'First Name', required: false },
        ],
        klaviyo_list_id: request.klaviyoListId,
        klaviyo_tags: request.klaviyoTags || [],
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, page: page as LandingPage };
  } catch (error) {
    console.error('Landing page creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function processFormSubmission(
  submissionId: string
): Promise<LeadCaptureResult> {
  const supabase = await createServerSupabaseClient();

  try {
    // Process submission and create/update lead
    const { data: leadId, error } = await (supabase as any).rpc('process_form_submission', {
      p_submission_id: submissionId,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Get the created lead
    const { data: lead } = await (supabase as any)
      .from('leads')
      .select('*, landing_page:landing_pages(*)')
      .eq('id', leadId)
      .single();

    if (!lead) {
      throw new Error('Lead not found after processing');
    }

    // Sync to Klaviyo
    if (lead.landing_page?.klaviyo_list_id) {
      await syncLeadToKlaviyo(lead.user_id, lead as Lead, {
        listId: lead.landing_page.klaviyo_list_id,
        tags: lead.landing_page.klaviyo_tags || [],
      });
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: lead.user_id,
      p_action_type: 'lead_captured',
      p_details: {
        leadId: lead.id,
        email: lead.email,
        source: lead.source,
        landingPageId: lead.landing_page_id,
      },
      p_executed: true,
      p_module: 'leads',
      p_reference_id: lead.id,
      p_reference_table: 'leads',
    });

    return { success: true, lead: lead as Lead };
  } catch (error) {
    console.error('Form submission processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function captureLead(
  userId: string,
  landingPageId: string,
  data: Record<string, string>,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    referrer?: string;
  }
): Promise<LeadCaptureResult> {
  const supabase = await createServerSupabaseClient();

  try {
    // Create form submission
    const { data: submission, error: submissionError } = await (supabase as any)
      .from('form_submissions')
      .insert({
        user_id: userId,
        landing_page_id: landingPageId,
        data,
        ip_address: metadata?.ipAddress,
        user_agent: metadata?.userAgent,
      })
      .select()
      .single();

    if (submissionError) {
      throw new Error(submissionError.message);
    }

    // Process the submission
    return processFormSubmission(submission.id);
  } catch (error) {
    console.error('Lead capture error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function convertLeadToCustomer(
  userId: string,
  leadId: string,
  shopifyCustomerId: string,
  orderId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    const { error } = await (supabase as any)
      .from('leads')
      .update({
        status: 'customer',
        shopify_customer_id: shopifyCustomerId,
        converted_at: new Date().toISOString(),
        first_order_id: orderId,
      })
      .eq('id', leadId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'lead_converted',
      p_details: { leadId, shopifyCustomerId, orderId },
      p_executed: true,
      p_module: 'leads',
      p_reference_id: leadId,
      p_reference_table: 'leads',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
