import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

interface ImageGenerationOptions {
  prompt: string;
  inputImages?: Buffer[];
  outputPath?: string;
  aspectRatio?: string;
  style?: 'photorealistic' | 'illustration' | 'sticker' | 'minimalist' | 'comic' | 'artistic';
  quality?: 'standard' | 'high';
}

interface ImageEditingOptions {
  prompt: string;
  baseImage: Buffer;
  outputPath?: string;
  preserveDetails?: boolean;
  editingMode?: 'add' | 'remove' | 'modify' | 'style_transfer' | 'inpainting';
}

interface NanoBananaResponse {
  success: boolean;
  imageBuffer?: Buffer;
  textResponse?: string;
  error?: string;
  outputPath?: string;
}

class NanoBananaService {
  private genAI: GoogleGenerativeAI;
  private model: string = 'gemini-2.5-flash-image-preview'; // Back to image generation model
  private imageModel: string = 'gemini-2.5-flash-image-preview'; // Image generation model

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate image from text prompt (Text-to-Image)
   */
  async generateImage(options: ImageGenerationOptions): Promise<NanoBananaResponse> {
    try {
      console.log(`🎨 nanoBanana: Using model ${this.model} for image generation`);
      const model = this.genAI.getGenerativeModel({ model: this.model });
      
      const enhancedPrompt = this.enhancePrompt(options.prompt, options.style, options.aspectRatio);
      console.log(`📝 nanoBanana: Calling Gemini with enhanced prompt length: ${enhancedPrompt.length}`);
      
      const result = await model.generateContent([enhancedPrompt]);
      
      return await this.processResponse(result, options.outputPath);
    } catch (error) {
      console.error(`❌ nanoBanana generateImage error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error details: ${errorMessage}`);
      
      return {
        success: false,
        error: `Image generation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Edit existing image with text prompt (Image + Text-to-Image)
   */
  async editImage(options: ImageEditingOptions): Promise<NanoBananaResponse> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      
      const enhancedPrompt = this.enhanceEditingPrompt(options.prompt, options.editingMode, options.preserveDetails);
      
      const imagePart = {
        inlineData: {
          data: options.baseImage.toString('base64'),
          mimeType: 'image/png' // Assume PNG, could be made dynamic
        }
      };

      const result = await model.generateContent([enhancedPrompt, imagePart]);
      
      return await this.processResponse(result, options.outputPath);
    } catch (error) {
      return {
        success: false,
        error: `Image editing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create image composition from multiple images
   */
  async composeImages(prompt: string, images: Buffer[], outputPath?: string): Promise<NanoBananaResponse> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      
      const imageParts = images.map(image => ({
        inlineData: {
          data: image.toString('base64'),
          mimeType: 'image/png'
        }
      }));

      const enhancedPrompt = `Create a new image by combining the elements from the provided images. ${prompt}`;
      
      const result = await model.generateContent([enhancedPrompt, ...imageParts]);
      
      return await this.processResponse(result, outputPath);
    } catch (error) {
      return {
        success: false,
        error: `Image composition failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate logo with text
   */
  async generateLogo(brandName: string, style: string = 'modern, minimalist', outputPath?: string): Promise<NanoBananaResponse> {
    const logoPrompt = `Create a modern, minimalist logo for a brand called '${brandName}' with the text "${brandName}" in a ${style} style. The design should be clean and professional, with a transparent background suitable for web use.`;
    
    return await this.generateImage({
      prompt: logoPrompt,
      outputPath,
      style: 'minimalist'
    });
  }

  /**
   * Generate product mockup
   */
  async generateProductMockup(productDescription: string, style: string = 'studio-lit', outputPath?: string): Promise<NanoBananaResponse> {
    const mockupPrompt = `A high-resolution, studio-lit product photograph of ${productDescription} on a clean white background. The lighting is a three-point softbox setup to showcase the product clearly. Ultra-realistic, with sharp focus and professional commercial photography style.`;
    
    return await this.generateImage({
      prompt: mockupPrompt,
      outputPath,
      style: 'photorealistic'
    });
  }

  /**
   * Generate sticker/icon
   */
  async generateSticker(subject: string, style: string = 'kawaii', outputPath?: string): Promise<NanoBananaResponse> {
    const stickerPrompt = `A ${style}-style sticker of ${subject}, featuring bright colors and clean lines. The design should have bold outlines and flat shading. The background must be transparent.`;
    
    return await this.generateImage({
      prompt: stickerPrompt,
      outputPath,
      style: 'sticker'
    });
  }

  /**
   * Generate combined desktop and mobile mockup in a single image
   */
  async generateDesktopHeroImage(visualPrompt: string, mood: string = 'professional', outputPath?: string): Promise<NanoBananaResponse> {
    const combinedMockupPrompt = `Create a professional mockup showcase featuring both desktop and mobile views of ${visualPrompt}

MOCKUP SHOWCASE REQUIREMENTS:
- Show a desktop computer/laptop screen on the left side
- Show a smartphone on the right side  
- Both should showcase the same business concept optimized for each platform
- ${mood} aesthetic with clean, modern mockup presentation

DESKTOP MOCKUP (LEFT SIDE):
- Modern desktop computer or laptop displaying the website
- Complete website interface showing the full webpage on the screen
- Navigation bar, hero section, content sections, footer
- Professional web design with the business theme (${visualPrompt})
- Realistic content, headlines, images, and call-to-action elements
- Modern web design standards and typography

MOBILE MOCKUP (RIGHT SIDE):
- Modern smartphone displaying the mobile version
- Mobile app/website interface optimized for mobile viewing on the phone screen
- Touch-friendly interface elements and mobile navigation
- Vertically scrollable mobile page layout visible on phone
- Mobile navigation (hamburger menu, mobile header)
- Same business theme adapted for mobile viewing
- Realistic mobile UI components and styling

PRESENTATION STYLE:
- Clean, professional mockup presentation
- White or light gray background
- Good spacing between desktop and mobile mockups
- High-quality, professional device showcase
- Focus on the user experience and visual design
- Realistic device frames and shadows

IMAGE SPECIFICATIONS:
- 1200x600 pixels (2:1 aspect ratio)
- Desktop mockup on left, mobile mockup on right
- Clean, modern mockup presentation
- Professional device showcase with realistic hardware`;
    
    return await this.generateImage({
      prompt: combinedMockupPrompt,
      outputPath,
      aspectRatio: '2:1',
      style: 'minimalist',
      quality: 'high'
    });
  }

  /**
   * Generate mobile hero image - now returns the same combined mockup as desktop
   */
  async generateMobileHeroImage(visualPrompt: string, mood: string = 'professional', outputPath?: string): Promise<NanoBananaResponse> {
    // Since we're now generating a combined desktop + mobile mockup in one image,
    // the mobile method returns the same result as desktop
    return await this.generateDesktopHeroImage(visualPrompt, mood, outputPath);
  }

  /**
   * Generate project preview UI - desktop website interface only, no hardware
   * Specifically designed for project preview feature
   */
  async generateProjectPreviewUI(visualPrompt: string, mood: string = 'professional', outputPath?: string): Promise<NanoBananaResponse> {
    const desktopUIPrompt = `Create a full desktop website interface design based on this description: ${visualPrompt}

DESKTOP WEBSITE INTERFACE REQUIREMENTS:
- Show ONLY the website interface design, NO computer/laptop/hardware
- Full webpage layout taking up the entire image canvas
- Complete website structure with all sections visible
- ${mood} aesthetic with clean, modern web design

WEBSITE SECTIONS TO INCLUDE:
- Header with navigation bar and logo
- Hero section with compelling headline and visuals
- Main content sections showcasing the business/service
- Feature highlights or services section
- Call-to-action elements and buttons
- Footer with contact information and links

DESIGN SPECIFICATIONS:
- Professional web design following modern standards
- Business theme based on: ${visualPrompt}
- Realistic content, headlines, and imagery
- Proper typography hierarchy and spacing
- Modern UI components (buttons, forms, cards)
- Clean layout with good visual hierarchy
- Professional color scheme and branding

PRESENTATION STYLE:
- Pure UI design presentation (no device frames)
- Website interface fills the entire image
- High-resolution, pixel-perfect design
- Professional web design quality
- Focus entirely on the user interface
- Clean, modern aesthetic suitable for business use

IMAGE SPECIFICATIONS:
- 1200x800 pixels (3:2 aspect ratio) for detailed view
- Desktop website interface only
- No hardware, devices, or mockup frames
- Pure flat UI design presentation
- Website takes up full image canvas`;
    
    return await this.generateImage({
      prompt: desktopUIPrompt,
      outputPath,
      aspectRatio: '3:2',
      style: 'minimalist',
      quality: 'high'
    });
  }

  /**
   * Generate website hero image optimized for web display (legacy method - kept for compatibility)
   */
  async generateHeroImage(visualPrompt: string, mood: string = 'professional', outputPath?: string): Promise<NanoBananaResponse> {
    // Default to desktop version for backward compatibility
    return await this.generateDesktopHeroImage(visualPrompt, mood, outputPath);
  }

  /**
   * Enhance prompt based on style and requirements
   */
  private enhancePrompt(basePrompt: string, style?: string, aspectRatio?: string): string {
    let enhanced = basePrompt;

    // Style-specific enhancements
    switch (style) {
      case 'photorealistic':
        enhanced = `A photorealistic ${enhanced}. Captured with high-quality camera settings, emphasizing fine details and realistic lighting.`;
        break;
      case 'illustration':
        enhanced = `An illustrated version of ${enhanced} with artistic flair and stylized elements.`;
        break;
      case 'sticker':
        enhanced = `A sticker-style illustration of ${enhanced} with bold outlines, bright colors, and transparent background.`;
        break;
      case 'minimalist':
        enhanced = `A minimalist composition featuring ${enhanced} with clean lines, simple forms, and plenty of negative space. High-quality, crisp details, optimized for digital display.`;
        break;
      case 'comic':
        enhanced = `A comic book style illustration of ${enhanced} with bold colors, dramatic lighting, and dynamic composition.`;
        break;
    }

    // Add aspect ratio and quality specifications
    if (aspectRatio === '16:9') {
      enhanced += ` The image should be in 16:9 widescreen format (1200x675 pixels or similar), perfectly optimized for web hero sections and desktop display.`;
    } else if (aspectRatio === '7:3') {
      enhanced += ` The image should be in 7:3 wide format (1400x600 pixels or similar), maximizing horizontal space utilization for better visual impact and content distribution.`;
    } else if (aspectRatio === '3:1') {
      enhanced += ` The image should be in 3:1 extra wide format (1800x600 pixels or similar), creating an ultra-wide desktop hero section with maximum horizontal space for content and visual elements.`;
    } else if (aspectRatio === '2:1') {
      enhanced += ` The image should be in 2:1 wide format (1200x600 pixels), optimized for desktop hero sections with clean proportions and efficient space utilization.`;
    } else if (aspectRatio === '3:4') {
      enhanced += ` The image should be in 3:4 portrait format (600x800 pixels or similar), optimized for mobile hero sections with vertical orientation and touch-friendly design.`;
    } else if (aspectRatio === '2:3') {
      enhanced += ` The image should be in 2:3 portrait format (400x600 pixels), compact and optimized for mobile hero sections with efficient vertical space usage.`;
    } else if (aspectRatio === '3:2') {
      enhanced += ` The image should be in 3:2 format (1200x800 pixels or similar), ideal for device mockup presentations with proper proportions for desktop and mobile showcase.`;
    } else if (aspectRatio) {
      enhanced += ` The image should be in ${aspectRatio} format.`;
    }

    // Add web optimization for hero images
    if (enhanced.includes('website hero') || enhanced.includes('web design')) {
      enhanced += ` Ensure the image is sharp, high-resolution, and looks professional across different screen sizes. Use modern web design principles with good contrast and visual hierarchy.`;
    }

    return enhanced;
  }

  /**
   * Enhance editing prompts
   */
  private enhanceEditingPrompt(basePrompt: string, mode?: string, preserveDetails?: boolean): string {
    let enhanced = basePrompt;

    if (preserveDetails) {
      enhanced = `Using the provided image, ${enhanced}. Ensure that all other details in the original image remain completely unchanged, preserving the original style, lighting, and composition.`;
    } else {
      enhanced = `Using the provided image, ${enhanced}`;
    }

    switch (mode) {
      case 'inpainting':
        enhanced = `Change only the specified element in the provided image. ${enhanced}. Keep everything else exactly the same.`;
        break;
      case 'style_transfer':
        enhanced = `Transform the provided image with this style: ${enhanced}. Preserve the original composition but render it with the new artistic style.`;
        break;
    }

    return enhanced;
  }

  /**
   * Process the API response and handle image data
   */
  private async processResponse(result: any, outputPath?: string): Promise<NanoBananaResponse> {
    try {
      const candidate = result.response?.candidates?.[0];
      if (!candidate) {
        return {
          success: false,
          error: 'No response from Gemini API'
        };
      }

      let imageBuffer: Buffer | undefined;
      let textResponse: string | undefined;

      for (const part of candidate.content.parts) {
        if (part.text) {
          textResponse = part.text;
        } else if (part.inlineData) {
          imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          
          // Save to file if output path is specified
          if (outputPath && imageBuffer) {
            // Ensure directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(outputPath, imageBuffer);
          }
          break;
        }
      }

      if (!imageBuffer && !textResponse) {
        return {
          success: false,
          error: 'No image or text content in response'
        };
      }

      return {
        success: true,
        imageBuffer,
        textResponse,
        outputPath: outputPath && imageBuffer ? outputPath : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Response processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Utility function to load image from file path
   */
  static loadImageFromPath(imagePath: string): Buffer {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    return fs.readFileSync(imagePath);
  }

  /**
   * Utility function to save buffer to file
   */
  static saveImageBuffer(buffer: Buffer, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, buffer);
  }
}

// Export the service class and interfaces
export { NanoBananaService, ImageGenerationOptions, ImageEditingOptions, NanoBananaResponse };

// Export a default instance for easy use
export default new NanoBananaService();