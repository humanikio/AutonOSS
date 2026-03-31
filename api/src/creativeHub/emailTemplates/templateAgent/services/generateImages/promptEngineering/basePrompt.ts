/**
 * Base prompt guidelines for email template image generation
 * These guidelines ensure images are optimized for email use
 */

export const BASE_PROMPT_FOR_EMAIL_IMAGES = `
EMAIL IMAGE GENERATION GUIDELINES:

You are generating images specifically for use in email templates. Follow these critical guidelines:

TECHNICAL CONSTRAINTS:
- Optimize for web display (72-150 DPI)
- Use email-safe colors (avoid pure blacks #000000, ensure sufficient contrast)
- Design with dark mode compatibility in mind
- Keep visual complexity reasonable for email rendering
- Design for typical email width of 600px
- Consider how images will look at various screen sizes

EMAIL-SPECIFIC REQUIREMENTS:
- Create clear focal points that work at small sizes
- Ensure text overlay compatibility where needed
- Maintain brand consistency with the email template context
- Use professional, trustworthy aesthetic appropriate for business email
- Avoid overly complex details that may not render well in email clients
- Consider accessibility - sufficient color contrast, clear subjects

IMAGE TYPES FOR EMAIL TEMPLATES:

1. HEADER/HERO IMAGES:
   - Wide format (recommended: 600x300px to 600x400px)
   - Engaging visual that sets the tone for the email
   - Should complement the email's message and audience
   - Can include subtle branding elements
   - Professional quality with clear focal point

2. CTA BACKGROUNDS:
   - Support text overlays with good contrast
   - Draw eye to call-to-action without overwhelming button text
   - Use gradients or solid colors that enhance readability
   - Create depth and visual interest while staying subtle

3. SECTION DIVIDERS:
   - Subtle, complementary designs
   - Enhance readability without distraction
   - Help organize email content visually
   - Maintain consistent style with overall email aesthetic

4. ICONS/DECORATIONS:
   - Simple, scalable, recognizable at small sizes
   - Enhance visual hierarchy
   - Support the email's messaging
   - Professional and on-brand

STYLE CONSIDERATIONS:
- Match the industry and audience (legal = trustworthy/professional, creative = bold/modern)
- Align with described brand colors and aesthetic
- Create cohesive visual language across all images in the template
- Balance creativity with professionalism
- Ensure images enhance rather than distract from email content

QUALITY STANDARDS:
- Professional commercial quality
- Clean composition with clear visual hierarchy
- Appropriate mood and atmosphere for email context
- High enough resolution for clarity without excessive file size
- Polished, production-ready output
`;

export const emailImageQualityModifiers = {
  professional: 'professional business quality, polished execution, trustworthy aesthetic, suitable for corporate email',
  modern: 'modern contemporary design, clean lines, current design trends, engaging visual style',
  elegant: 'elegant sophisticated aesthetic, refined details, premium quality, upscale presentation',
  friendly: 'friendly approachable style, warm inviting feel, accessible design, personable quality',
  bold: 'bold eye-catching design, strong visual impact, confident execution, memorable imagery'
};

export const emailImagePurposes = {
  header: 'email header/hero image, wide format, sets tone for email, engaging first impression',
  cta_background: 'call-to-action background, supports text overlay, draws attention to action',
  section_divider: 'section divider, subtle visual break, enhances content organization',
  icon: 'icon or decorative element, simple scalable design, supports messaging',
  illustration: 'illustrative element, enhances email story, professional quality'
};

/**
 * Build enhanced prompt with email-specific context
 */
export function enhanceWithEmailContext(
  baseRequest: string,
  options?: {
    quality?: keyof typeof emailImageQualityModifiers;
    purpose?: keyof typeof emailImagePurposes;
  }
): string {
  const quality = options?.quality
    ? emailImageQualityModifiers[options.quality]
    : emailImageQualityModifiers.professional;

  const purpose = options?.purpose
    ? emailImagePurposes[options.purpose]
    : emailImagePurposes.header;

  return `${baseRequest}. ${purpose}. ${quality}. Optimized for email template use with proper sizing and email-safe rendering.`;
}
