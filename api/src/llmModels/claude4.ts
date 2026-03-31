import Anthropic from '@anthropic-ai/sdk';

export class Claude4Model {
  private client: Anthropic;
  private model: string = 'claude-sonnet-4-5-20250929';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async processText(text: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: text,
          },
        ],
      });

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }

      throw new Error('Unexpected response format from Anthropic API');
    } catch (error) {
      console.error('Error processing text with Claude 4:', error);
      throw error;
    }
  }

  async processTextWithSystemPrompt(systemPrompt: string, userText: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userText,
          },
        ],
      });

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }

      throw new Error('Unexpected response format from Anthropic API');
    } catch (error) {
      console.error('Error processing text with Claude 4:', error);
      throw error;
    }
  }

  async sendMessage(messages: Array<{role: 'user' | 'assistant', content: string}>): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        messages: messages,
      });

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }

      throw new Error('Unexpected response format from Anthropic API');
    } catch (error) {
      console.error('Error sending message to Claude 4:', error);
      throw error;
    }
  }

  async analyzeImage(params: {
    imageData: string;
    mediaType: string;
    prompt: string;
  }): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: params.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: params.imageData,
                },
              },
              {
                type: 'text',
                text: params.prompt,
              },
            ],
          },
        ],
      });

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }

      throw new Error('Unexpected response format from Anthropic API');
    } catch (error) {
      console.error('Error analyzing image with Claude 4:', error);
      throw error;
    }
  }

  async processWithImages(params: {
    images: Array<{ base64: string; mimeType: string; caption?: string }>;
    textPrompt: string;
  }): Promise<string> {
    try {
      // Build content array: images with optional captions, then text prompt
      const content: any[] = [];

      // Add each image with optional caption
      params.images.forEach((image, idx) => {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: image.base64,
          },
        });

        if (image.caption) {
          content.push({
            type: 'text',
            text: image.caption,
          });
        }
      });

      // Add main text prompt at the end
      content.push({
        type: 'text',
        text: params.textPrompt,
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }

      throw new Error('Unexpected response format from Anthropic API');
    } catch (error) {
      console.error('Error processing with images in Claude 4:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const claude4 = new Claude4Model();

export default Claude4Model;