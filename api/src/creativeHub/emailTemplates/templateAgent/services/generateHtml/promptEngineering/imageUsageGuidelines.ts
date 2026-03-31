export const IMAGE_USAGE_GUIDELINES = `
==================
IMAGE USAGE GUIDELINES
==================

IMPORTANT: You have been provided with existing images that were generated for this email template.
These images are ALREADY AVAILABLE and should be used in your HTML code.

HOW TO USE EXISTING IMAGES:

1. REFERENCE IMAGE URLS IN HTML
   - Use the provided image URLs directly in <img> tags
   - Do NOT generate new image URLs or use placeholder URLs
   - The images are hosted on Firebase Storage and are publicly accessible

2. IMAGE TAG FORMAT
   Always use this format for email compatibility:

   <img
     src="ACTUAL_IMAGE_URL_PROVIDED"
     alt="Descriptive alt text"
     width="600"
     height="400"
     style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;"
   />

3. IMAGE TYPES AND USAGE
   - Hero Images: Full-width banner at the top (600px wide typically)
   - Product Images: Featured items or showcases (300-600px wide)
   - Icon Images: Small graphics or illustrations (50-150px wide)
   - Background Images: Used in table cells with fallback colors

4. RESPONSIVE IMAGE HANDLING
   - Specify explicit width and height attributes
   - Use style="max-width: 100%; height: auto;" for responsiveness
   - Ensure images scale properly on mobile devices
   - Consider retina displays (use @2x images when available)

5. ACCESSIBILITY REQUIREMENTS
   - ALWAYS include descriptive alt text
   - Alt text should describe the image content and purpose
   - Keep alt text concise but informative (under 125 characters ideal)
   - For decorative images, use alt=""

6. EMAIL CLIENT COMPATIBILITY
   - Some clients block images by default (Gmail, Outlook)
   - Always provide fallback background colors
   - Ensure content is readable even without images
   - Use alt text that maintains message clarity

7. IMAGE POSITIONING
   Common patterns:

   a) Hero Image (full-width):
   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
     <tr>
       <td style="background-color: #f0f0f0;">
         <img src="HERO_IMAGE_URL" alt="Hero image description" width="600" height="400"
              style="display: block; width: 100%; max-width: 600px; height: auto;" />
       </td>
     </tr>
   </table>

   b) Image with Text Below:
   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
     <tr>
       <td align="center" style="padding-bottom: 20px;">
         <img src="IMAGE_URL" alt="Description" width="400" height="300"
              style="display: block; max-width: 100%; height: auto;" />
       </td>
     </tr>
     <tr>
       <td style="padding: 0 30px;">
         <p style="font-size: 16px; line-height: 1.6; color: #333333;">Text content here</p>
       </td>
     </tr>
   </table>

   c) Side-by-Side Images (2-column):
   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
     <tr>
       <td width="50%" style="padding: 10px;">
         <img src="IMAGE_URL_1" alt="Description 1" width="280" height="200"
              style="display: block; width: 100%; max-width: 280px; height: auto;" />
       </td>
       <td width="50%" style="padding: 10px;">
         <img src="IMAGE_URL_2" alt="Description 2" width="280" height="200"
              style="display: block; width: 100%; max-width: 280px; height: auto;" />
       </td>
     </tr>
   </table>

8. BACKGROUND IMAGES
   Email clients have poor support for background images. Use this pattern:

   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="background-color: #0066CC; background-image: url('BACKGROUND_IMAGE_URL');
                 background-position: center; background-size: cover;">
     <tr>
       <td style="padding: 60px 30px; text-align: center;">
         <!-- Fallback background color ensures readability if image doesn't load -->
         <h1 style="color: #ffffff; font-size: 36px; margin: 0;">Headline Text</h1>
       </td>
     </tr>
   </table>

9. IMAGE OPTIMIZATION TIPS
   - Use appropriate image dimensions (don't force resize large images)
   - Hero images: typically 600x400px or 600x300px
   - Product images: 300x300px or 400x400px
   - Icons: 50x50px to 150x150px
   - Keep file sizes reasonable (<200KB per image ideal)

10. WHEN IMAGES ARE PROVIDED
    - You will receive a section titled "EXISTING TEMPLATE IMAGES"
    - Each image includes: URL, purpose, dimensions, style
    - Match the image purpose to the appropriate section of the template
    - Example: "Hero image" ’ use at the top of the template
    - Example: "Product showcase" ’ use in the main content area

11. HANDLING MISSING IMAGES
    - If specifications mention images but none are provided, use placeholder pattern:
    - Include a background color and text indicating "Image will be inserted"
    - DO NOT use external placeholder services (no placeholder.com, etc.)
    - Example fallback:

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="background-color: #e5e7eb; padding: 100px 30px; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            [Image placeholder - to be replaced with actual image]
          </p>
        </td>
      </tr>
    </table>

REMEMBER:
- Use provided image URLs exactly as given
- Include proper alt text for all images
- Ensure responsive behavior with inline styles
- Consider email clients that block images
- Provide fallback colors for background images
- Match image purpose to template section
- Maintain accessibility standards

If you see "EXISTING TEMPLATE IMAGES" in your context, use those URLs in your HTML code!
`;
