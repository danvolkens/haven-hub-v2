import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST - Send a test email
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      template_id,
      to_email,
      subject_override,
      // Allow passing template data directly for testing unsaved templates
      template_data
    } = body;

    if (!to_email) {
      return NextResponse.json({
        error: 'Missing required field: to_email'
      }, { status: 400 });
    }

    if (!template_id && !template_data) {
      return NextResponse.json({
        error: 'Must provide either template_id or template_data'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to_email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    let template: {
      subject: string;
      html_content?: string;
      content_html?: string;
      button_text?: string;
      button_url?: string;
    };

    if (template_id) {
      // Get the template from database
      const { data: dbTemplate, error: templateError } = await (supabase as any)
        .from('email_templates')
        .select('*')
        .eq('id', template_id)
        .eq('user_id', user.id)
        .single();

      if (templateError || !dbTemplate) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      template = dbTemplate;
    } else {
      // Use provided template data
      template = template_data;
    }

    // Get base template if available for proper rendering
    const { data: baseTemplate } = await (supabase as any)
      .from('email_base_templates')
      .select('html_content')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // Determine which HTML to use
    let htmlContent = template.html_content || '';

    // If we have a base template and content_html, merge them
    if (baseTemplate?.html_content && template.content_html) {
      htmlContent = baseTemplate.html_content
        .replace('{{CONTENT}}', template.content_html)
        .replace(/\{\{BUTTON_TEXT\}\}/g, template.button_text || 'Shop Now')
        .replace(/\{\{BUTTON_URL\}\}/g, template.button_url || '#');
    }

    // Replace Klaviyo variables with test values for preview
    const testVariables: Record<string, string> = {
      'first_name': 'Test',
      'last_name': 'User',
      'email': to_email,
      'url': 'https://havenandhold.com',
      'checkout_url': 'https://havenandhold.com/checkout',
      'unsubscribe_url': '#unsubscribe',
      'organization.name': 'Haven & Hold',
    };

    // Replace {{ variable }} and {{ variable|default:'value' }} patterns
    htmlContent = htmlContent.replace(
      /\{\{\s*([^}|]+)(?:\|default:'([^']*)')?\s*\}\}/g,
      (match: string, variable: string, defaultValue: string) => {
        const trimmedVar = variable.trim();
        return testVariables[trimmedVar] || defaultValue || match;
      }
    );

    // Replace {% %} tags with placeholders
    htmlContent = htmlContent
      .replace(/\{%\s*current_year\s*%\}/g, new Date().getFullYear().toString())
      .replace(/\{%\s*unsubscribe\s*%\}/g, '<a href="#unsubscribe">Unsubscribe</a>');

    // Get user's settings for from email
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('email_from_address, email_from_name')
      .eq('user_id', user.id)
      .single();

    const fromName = settings?.email_from_name || 'Haven & Hold';
    const subject = subject_override || template.subject || 'Test Email';

    // Use the verified Resend domain for test emails
    const fromEmail = 'noreply@updates.havenandhold.com';

    // Send via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to_email],
      subject: `[TEST] ${subject}`,
      html: htmlContent,
    });

    if (emailError) {
      console.error('Error sending test email:', emailError);
      return NextResponse.json({
        error: 'Failed to send test email',
        details: emailError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to_email}`,
      email_id: emailResult?.id,
    });
  } catch (error) {
    console.error('Error in POST /api/email-workflows/templates/test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
