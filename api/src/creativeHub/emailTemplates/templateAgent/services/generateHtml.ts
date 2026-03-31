/**
 * HTML Generation Service for Email Templates
 * Orchestrates the HTML generation workflow
 */

import { prepareData } from './generateHtml/prepareData';
import { buildPrompt } from './generateHtml/buildPrompt';
import { generateCode } from './generateHtml/generateCode';
import { readTask, updateTask } from './taskManager';
import { updateEmailTemplate } from '../../../emailTemplates/services/emailTemplateManager/updateEmailTemplate';

export interface GenerateHtmlInput {
  tenantId: string;
  templateId: string;
  cycleId: string;
  taskId: string;
}

export interface GenerateHtmlOutput {
  success: boolean;
  html: string;
  assistantMessage: string;
  taskId: string;
  result?: any; // Result data for orchestrator to store
}

/**
 * HTML Generation Service
 *
 * Pure worker that generates HTML code for email templates.
 * Returns result to orchestrator for state management.
 *
 * Flow:
 * 1. Read task to get HTML generation parameters
 * 2. Prepare data - fetch images and chat history (prepareData)
 * 3. Build comprehensive prompt with context (buildPrompt)
 * 4. Generate HTML via Claude LLM (generateCode)
 * 5. Save HTML to template document (updateEmailTemplate)
 * 6. Return result to orchestrator (orchestrator handles task/cycle updates and chat message)
 */
export async function generateHtml(input: GenerateHtmlInput): Promise<GenerateHtmlOutput> {
  const { tenantId, templateId, cycleId, taskId } = input;

  console.log('\n========================================');
  console.log('[Generate HTML] START');
  console.log('========================================');
  console.log('[Generate HTML] Task ID:', taskId);
  console.log('[Generate HTML] Cycle ID:', cycleId);
  console.log('[Generate HTML] Template ID:', templateId);

  try {
    // Step 1: Read task to get HTML parameters
    console.log('[Generate HTML] Step 1: Reading task...');
    const task = await readTask(tenantId, templateId, cycleId, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.type !== 'htmlGeneration') {
      throw new Error(`Task ${taskId} is not an htmlGeneration task (type: ${task.type})`);
    }

    if (task.status === 'completed') {
      console.log('[Generate HTML] � Task already completed, returning existing results');
      return {
        success: true,
        html: task.result?.html || '',
        assistantMessage: task.result?.assistantMessage || '',
        taskId
      };
    }

    console.log('[Generate HTML]  Task loaded');
    console.log('[Generate HTML] Parameters:', JSON.stringify(task.parameters, null, 2));

    // Update task to in_progress
    await updateTask({
      tenantId,
      templateId,
      cycleId,
      taskId,
      status: 'in_progress'
    });

    // Step 2: Prepare data - fetch images and chat history
    console.log('[Generate HTML] Step 2: Preparing data...');
    const preparedData = await prepareData({
      tenantId,
      templateId,
      cycleId,
      taskId,
      htmlParameters: task.parameters
    });

    console.log('[Generate HTML]  Data prepared successfully');
    console.log('[Generate HTML] Existing images:', preparedData.existingImages.length);
    console.log('[Generate HTML] Chat history:', preparedData.chatHistory.length);

    // Step 3: Build comprehensive prompt with context
    console.log('[Generate HTML] Step 3: Building prompt...');
    const promptResult = await buildPrompt({
      htmlParameters: preparedData.htmlParameters,
      existingImages: preparedData.existingImages,
      chatHistory: preparedData.chatHistory,
      currentTemplate: preparedData.currentTemplate
    });

    console.log('[Generate HTML]  Prompt built successfully');
    console.log('[Generate HTML] Prompt length:', promptResult.fullPrompt.length, 'characters');

    // Step 4: Generate HTML code using Claude
    console.log('[Generate HTML] Step 4: Generating HTML code...');
    const codeResult = await generateCode({
      fullPrompt: promptResult.fullPrompt,
      existingImages: promptResult.existingImages
    });

    console.log('[Generate HTML]  HTML code generated successfully');
    console.log('[Generate HTML] HTML length:', codeResult.html.length, 'characters');
    console.log('[Generate HTML] Assistant message:', codeResult.assistantMessage.substring(0, 80) + '...');

    // Step 5: Save HTML to template document
    console.log('[Generate HTML] Step 5: Saving HTML to template...');
    await updateEmailTemplate(tenantId, templateId, {
      htmlContent: codeResult.html
    });

    console.log('[Generate HTML]  HTML saved to template document');
    console.log('[Generate HTML]  COMPLETE');
    console.log('========================================\n');

    // Return result - orchestrator will handle state management and chat message
    return {
      success: true,
      html: codeResult.html,
      assistantMessage: codeResult.assistantMessage,
      taskId,
      result: {
        html: codeResult.html,
        assistantMessage: codeResult.assistantMessage,
        htmlLength: codeResult.html.length,
        repaired: codeResult.repaired
      }
    };
  } catch (error) {
    console.error('[Generate HTML] L ERROR:', error);
    console.error('[Generate HTML] Error details:', error instanceof Error ? error.stack : 'Unknown');
    console.log('========================================\n');

    // Let orchestrator handle error state management
    throw error;
  }
}
