/**
 * Image Generation Prompt Engineering Module
 * Exports all prompt components for email template images
 */

export {
  BASE_PROMPT_FOR_EMAIL_IMAGES,
  emailImageQualityModifiers,
  emailImagePurposes,
  enhanceWithEmailContext
} from './basePrompt';

export {
  emailImageExamples,
  emailImageTemplates,
  getEmailImageExample,
  getEmailImageTemplate
} from './examples';

export {
  formatChatHistoryForImages,
  FormatChatHistoryForImagesParams
} from './chatHistory';
