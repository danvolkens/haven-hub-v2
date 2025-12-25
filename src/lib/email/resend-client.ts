import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || 'Haven Hub <noreply@havenhub.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Send email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface DigestEmailContent {
  insights_count: number;
  pending_approvals: number;
  pins_published: number;
  pins_scheduled: number;
  orders_received: number;
  revenue: number;
  new_leads: number;
  recommendations_count: number;
  highlights: string[];
  top_insight?: {
    title: string;
    summary: string;
    priority: string;
  };
  at_risk_customers: number;
  upcoming_campaigns: number;
}

export function generateDigestHtml(content: DigestEmailContent): string {
  const priorityColors: Record<string, string> = {
    critical: '#DC2626',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#10B981',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily Haven Hub Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9F7F4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="padding: 32px 24px 24px; border-bottom: 1px solid #E8E4DF;">
      <h1 style="margin: 0 0 8px; color: #3D3633; font-size: 24px; font-weight: 600;">Your Daily Digest</h1>
      <p style="margin: 0; color: #6B6560; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Highlights -->
    ${content.highlights.length > 0 ? `
    <div style="padding: 24px; border-bottom: 1px solid #E8E4DF;">
      <h2 style="margin: 0 0 16px; color: #3D3633; font-size: 16px; font-weight: 600;">Highlights</h2>
      ${content.highlights.map(h => `<p style="margin: 0 0 8px; color: #3D3633; font-size: 14px;">${h}</p>`).join('')}
    </div>
    ` : ''}

    <!-- Top Insight -->
    ${content.top_insight ? `
    <div style="padding: 24px; border-bottom: 1px solid #E8E4DF;">
      <h2 style="margin: 0 0 16px; color: #3D3633; font-size: 16px; font-weight: 600;">Top Insight</h2>
      <div style="background-color: #F9F7F4; border-radius: 8px; padding: 16px; border-left: 4px solid ${priorityColors[content.top_insight.priority] || '#3B82F6'};">
        <h3 style="margin: 0 0 8px; color: #3D3633; font-size: 14px; font-weight: 600;">${content.top_insight.title}</h3>
        <p style="margin: 0; color: #6B6560; font-size: 14px;">${content.top_insight.summary}</p>
      </div>
    </div>
    ` : ''}

    <!-- Stats Grid -->
    <div style="padding: 24px;">
      <h2 style="margin: 0 0 16px; color: #3D3633; font-size: 16px; font-weight: 600;">At a Glance</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        <div style="background-color: #F9F7F4; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; color: #3D3633; font-size: 24px; font-weight: 600;">${content.pending_approvals}</p>
          <p style="margin: 0; color: #6B6560; font-size: 12px;">Pending Approvals</p>
        </div>
        <div style="background-color: #F9F7F4; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; color: #3D3633; font-size: 24px; font-weight: 600;">${content.pins_scheduled}</p>
          <p style="margin: 0; color: #6B6560; font-size: 12px;">Pins Scheduled</p>
        </div>
        <div style="background-color: #F9F7F4; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; color: #3D3633; font-size: 24px; font-weight: 600;">${content.insights_count}</p>
          <p style="margin: 0; color: #6B6560; font-size: 12px;">New Insights</p>
        </div>
        <div style="background-color: #F9F7F4; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; color: #3D3633; font-size: 24px; font-weight: 600;">${content.recommendations_count}</p>
          <p style="margin: 0; color: #6B6560; font-size: 12px;">Recommendations</p>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div style="padding: 0 24px 32px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.havenhub.com'}/dashboard"
         style="display: inline-block; background-color: #3D3633; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 500;">
        Open Dashboard
      </a>
    </div>

    <!-- Footer -->
    <div style="padding: 24px; background-color: #F9F7F4; border-radius: 0 0 12px 12px; text-align: center;">
      <p style="margin: 0; color: #6B6560; font-size: 12px;">
        You're receiving this because you enabled daily digests in Haven Hub.
        <br>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.havenhub.com'}/dashboard/settings" style="color: #6B6560;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateDigestText(content: DigestEmailContent): string {
  const lines: string[] = [
    'Your Daily Haven Hub Digest',
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    '',
  ];

  if (content.highlights.length > 0) {
    lines.push('HIGHLIGHTS', ...content.highlights, '');
  }

  if (content.top_insight) {
    lines.push(
      'TOP INSIGHT',
      `[${content.top_insight.priority.toUpperCase()}] ${content.top_insight.title}`,
      content.top_insight.summary,
      ''
    );
  }

  lines.push(
    'AT A GLANCE',
    `${content.pending_approvals} Pending Approvals`,
    `${content.pins_scheduled} Pins Scheduled`,
    `${content.insights_count} New Insights`,
    `${content.recommendations_count} Recommendations`,
    '',
    `View in Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.havenhub.com'}/dashboard`
  );

  return lines.join('\n');
}

export async function sendDigestEmail(
  email: string,
  content: DigestEmailContent
): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: email,
    subject: `Your Daily Haven Hub Digest - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    html: generateDigestHtml(content),
    text: generateDigestText(content),
    tags: [{ name: 'category', value: 'digest' }],
  });
}
