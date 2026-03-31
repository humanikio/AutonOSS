/**
 * Example prompts for email template images
 * Demonstrates best practices for different email image types
 */

export const emailImageExamples = {
  legal_services_header: {
    good: 'Professional email header for legal services firm. Clean, trustworthy design with subtle law-themed imagery (balanced scales, courthouse columns) softly integrated into background. Deep navy blue (#1a365d) primary color with warm gold accent (#C9A961). Wide format 600x300px. Modern sophisticated aesthetic that conveys professionalism and authority. Suitable for law firm email audience. Studio lighting with professional polish.',
    bad: 'Law stuff for email',
    explanation: 'Good prompts specify industry context, exact colors, dimensions, mood, and audience'
  },

  marketing_agency_header: {
    good: 'Email header image for digital marketing agency. Modern, dynamic design with abstract flowing shapes suggesting creativity and innovation. Vibrant gradient from electric blue to deep purple. Clean contemporary composition with strong visual hierarchy. 600x350px format. Professional quality suitable for B2B marketing email. Energetic yet trustworthy aesthetic.',
    bad: 'Marketing header',
    explanation: 'Includes specific style, colors, dimensions, and brand positioning'
  },

  holiday_promotional_header: {
    good: 'Festive holiday email header with professional approach. Elegant winter theme with subtle snowflakes and warm golden lighting. Rich deep green and burgundy colors with metallic gold accents. Sophisticated holiday aesthetic without being overly festive. 600x300px. Perfect for professional holiday promotional email. Balanced composition with space for text overlay.',
    bad: 'Holiday email image',
    explanation: 'Balances holiday theme with professional requirements and technical specs'
  },

  cta_button_background: {
    good: 'Call-to-action button background for email. Smooth gradient from deep primary blue (#0369a1) to lighter blue (#38bdf8). Subtle depth creating button prominence without overwhelming text. Optimized for white text overlay with excellent contrast. Professional quality suitable for business email CTA.',
    bad: 'Blue button background',
    explanation: 'Specifies exact colors, text overlay requirements, and visual hierarchy'
  },

  welcome_email_hero: {
    good: 'Welcome email hero image showing friendly professional team environment. Bright, inviting atmosphere with natural lighting. Modern office setting with collaborative energy. Diverse team members warmly welcoming viewer. 600x400px format. Clean professional photography style. Approachable yet professional aesthetic suitable for onboarding email.',
    bad: 'Office people',
    explanation: 'Describes mood, setting, purpose, and exact visual requirements'
  },

  newsletter_section_divider: {
    good: 'Subtle geometric section divider for professional newsletter. Clean horizontal line with elegant accent elements at center. Brand colors integrated tastefully. Minimalist design that enhances readability without distraction. 600x80px format. Professional quality suitable for recurring newsletter template.',
    bad: 'Line divider',
    explanation: 'Specifies subtlety, brand integration, and newsletter-specific requirements'
  },

  real_estate_property_showcase: {
    good: 'Real estate email header showcasing modern luxury home. Golden hour photography with warm inviting lighting. Professional architectural photography showing home exterior and landscaping. Upscale aesthetic appropriate for high-end property marketing. 600x350px. Clean composition with strong focal point on property. Premium quality suitable for luxury real estate email.',
    bad: 'House picture',
    explanation: 'Industry-specific details, lighting, quality level, and target audience'
  },

  event_invitation_header: {
    good: 'Event invitation email header with elegant sophistication. Abstract background with flowing gradient from deep purple to warm rose gold. Modern geometric accents adding visual interest. Space for event details text overlay with excellent contrast. 600x300px format. Upscale event aesthetic suitable for professional conference or gala invitation.',
    bad: 'Event background',
    explanation: 'Describes mood, specific colors, text overlay needs, and event type'
  },

  ecommerce_promotional: {
    good: 'E-commerce promotional email header with product focus area. Clean white background with subtle shadow and depth. Professional product photography lighting setup. Vibrant accent color (brand color) highlighting promotional message area. 600x320px. Commercial photography quality optimized for product showcase with sale messaging.',
    bad: 'Product promo image',
    explanation: 'Combines product photography requirements with promotional email needs'
  },

  tech_startup_announcement: {
    good: 'Tech startup announcement email header with innovative modern aesthetic. Abstract digital/tech-inspired background with flowing data visualization elements. Gradient from deep blue to cyan suggesting technology and innovation. Clean contemporary design with futuristic feel. 600x300px. Professional quality suitable for B2B tech announcement email.',
    bad: 'Tech background',
    explanation: 'Tech industry aesthetic with specific visual elements and professional tone'
  }
};

/**
 * Get example prompt by use case
 */
export function getEmailImageExample(
  category: keyof typeof emailImageExamples
): string {
  return emailImageExamples[category].good;
}

/**
 * Prompt templates for common email image scenarios
 */
export const emailImageTemplates = {
  header: (industry: string, colors: string, mood: string) =>
    `Professional email header for ${industry}. ${mood} aesthetic with ${colors}. Wide format 600x300px. High-quality design suitable for professional email. Clean composition with clear focal point. Email-optimized rendering.`,

  cta_background: (primaryColor: string, textColor: string = 'white') =>
    `Call-to-action background using ${primaryColor}. Optimized for ${textColor} text overlay with excellent contrast. Creates depth and draws attention. Professional quality suitable for email button. Subtle gradient for visual interest.`,

  hero_with_product: (product: string, background: string = 'clean white') =>
    `Hero image featuring ${product}. ${background} background. Professional product photography lighting. Commercial quality suitable for email showcase. 600x350px format. Clear focal point with space for text if needed.`,

  section_visual: (theme: string, brandColors: string) =>
    `Section visual element for email newsletter. ${theme} theme incorporating ${brandColors}. Subtle, non-distracting design that enhances content organization. Professional quality. Email-optimized sizing and rendering.`,

  icon_decorative: (concept: string, style: string = 'modern minimalist') =>
    `${style} icon representing ${concept}. Simple, clean design scalable to small sizes. Professional quality suitable for email template. Clear symbolism. Email-safe rendering.`
};

/**
 * Get filled template
 */
export function getEmailImageTemplate(
  template: keyof typeof emailImageTemplates,
  ...args: string[]
): string {
  const templateFn = emailImageTemplates[template] as (...args: string[]) => string;
  return templateFn(...args);
}
