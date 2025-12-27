/**
 * Email Template Merge Utility
 * Combines base templates with content to produce final HTML
 */

interface MergeOptions {
  baseHtml: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
}

/**
 * Merges content into a base template by replacing placeholders
 * Placeholders: {{CONTENT}}, {{BUTTON_TEXT}}, {{BUTTON_URL}}
 */
export function mergeTemplate(options: MergeOptions): string {
  const { baseHtml, content, buttonText, buttonUrl } = options;

  let result = baseHtml;

  // Replace content placeholder
  result = result.replace('{{CONTENT}}', content);

  // Replace button placeholders if provided
  if (buttonText) {
    result = result.replace(/\{\{BUTTON_TEXT\}\}/g, buttonText);
  }
  if (buttonUrl) {
    result = result.replace(/\{\{BUTTON_URL\}\}/g, buttonUrl);
  }

  return result;
}

/**
 * Creates a default base template with Haven & Hold branding
 * Used when user hasn't set up a custom base template
 */
export function getDefaultBaseTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #EDEAE3; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .email-body { background: #FAF9F6; padding: 48px; border-radius: 16px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header img { max-width: 200px; height: auto; }
    .content { font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif; font-size: 16px; color: #36454F; }
    .content h1 { font-family: 'Crimson Text', serif; font-weight: 400; font-size: 40px; margin-bottom: 20px; }
    .content p { margin-bottom: 1em; }
    .button-container { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background: #36454F; color: #FAF9F6 !important; padding: 16px 30px; text-decoration: none; border-radius: 4px; font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif; font-weight: 700; font-size: 16px; }
    .divider { border-top: 1px solid #B7B7B7; margin: 24px 0; }
    .footer { text-align: center; font-size: 12px; color: #727272; padding-top: 16px; }
    .social-links { text-align: center; margin-top: 24px; }
    .social-links a { display: inline-block; margin: 0 5px; }
    .social-links img { width: 32px; height: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-body">
      <div class="header">
        <img src="https://d3k81ch9hvuctc.cloudfront.net/company/R4ebYF/images/d101bd47-c657-4127-b05d-b184bd7f7c24.png" alt="Haven & Hold" />
      </div>
      <div class="content">
        {{CONTENT}}
      </div>
      <div class="button-container">
        <a href="{{BUTTON_URL}}" class="button">{{BUTTON_TEXT}}</a>
      </div>
      <div class="divider"></div>
      <div class="footer">
        <p>{{ organization.name }}<br/>© {% current_year %} | All rights reserved.</p>
        <p>{% unsubscribe %}</p>
      </div>
      <div class="social-links">
        <a href="https://www.instagram.com/havenandhold/"><img src="https://d3k81ch9hvuctc.cloudfront.net/assets/email/buttons/subtle/instagram_96.png" alt="Instagram" /></a>
        <a href="https://www.pinterest.com/havenandhold/"><img src="https://d3k81ch9hvuctc.cloudfront.net/assets/email/buttons/subtle/pinterest_96.png" alt="Pinterest" /></a>
        <a href="https://www.tiktok.com/@havenandhold"><img src="https://d3k81ch9hvuctc.cloudfront.net/assets/email/buttons/subtle/tiktok_96.png" alt="TikTok" /></a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Validates that a base template has required placeholders
 */
export function validateBaseTemplate(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!html.includes('{{CONTENT}}')) {
    errors.push('Missing {{CONTENT}} placeholder - this is where email body will be inserted');
  }

  // Optional but recommended
  const warnings: string[] = [];
  if (!html.includes('{{BUTTON_TEXT}}')) {
    warnings.push('No {{BUTTON_TEXT}} placeholder - button text will need to be hardcoded');
  }
  if (!html.includes('{{BUTTON_URL}}')) {
    warnings.push('No {{BUTTON_URL}} placeholder - button URL will need to be hardcoded');
  }

  return {
    valid: errors.length === 0,
    errors: [...errors, ...warnings]
  };
}

/**
 * Extracts placeholders from HTML content
 */
export function detectPlaceholders(html: string): string[] {
  const placeholders: string[] = [];

  if (html.includes('{{CONTENT}}')) placeholders.push('CONTENT');
  if (html.includes('{{BUTTON_TEXT}}')) placeholders.push('BUTTON_TEXT');
  if (html.includes('{{BUTTON_URL}}')) placeholders.push('BUTTON_URL');

  // Also detect any custom placeholders like {{CUSTOM_FIELD}}
  const customMatches = html.matchAll(/\{\{([A-Z_]+)\}\}/g);
  for (const match of customMatches) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}
