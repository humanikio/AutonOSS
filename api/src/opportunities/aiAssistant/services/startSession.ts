import { createFirestoreDocument } from './startSession/createFirestoreDocument';
import { managePipeline, PipelineResult } from './startSession/managePipeline';
import { processPrompt, ProcessPromptResult } from './processPrompt';

export interface StartSessionResult {
  sessionId: string;
  pipelineInfo: PipelineResult;
  initialAnalysis: ProcessPromptResult;
}

export async function startSession(
  tenantId: string,
  userId: string,
  initialPrompt: string,
  pipelineId?: string
): Promise<StartSessionResult> {
  try {
    console.log('=� Starting new AI assistant session...');
    console.log('=� Tenant ID:', tenantId);
    console.log('=� Initial prompt:', initialPrompt);
    console.log('=� Pipeline ID:', pipelineId || 'None provided');

    // Step 1: Manage pipeline (existing or create new ID)
    console.log('=� Step 1: Managing pipeline...');
    const pipelineInfo = await managePipeline(tenantId, pipelineId);
    console.log('=� Pipeline managed:', pipelineInfo);

    // Step 2: Create Firestore document for the session with pipeline data
    console.log('=� Step 2: Creating Firestore document...');
    const sessionId = await createFirestoreDocument(
      tenantId, 
      pipelineInfo.pipelineId, 
      initialPrompt,
      {
        name: pipelineInfo.name,
        isNew: pipelineInfo.isNew,
        existingStages: pipelineInfo.existingStages
      }
    );
    console.log('=� Session document created:', sessionId);

    // Step 3: Process the initial prompt
    console.log('>� Step 3: Processing initial prompt...');
    const initialAnalysis = await processPrompt(tenantId, sessionId, initialPrompt);
    console.log('>� Initial analysis completed:', initialAnalysis.aiResponse);

    const result: StartSessionResult = {
      sessionId,
      pipelineInfo,
      initialAnalysis
    };

    console.log(' AI assistant session started successfully!');
    console.log(' Session ID:', sessionId);
    console.log(' Pipeline:', pipelineInfo.isNew ? 'New pipeline created' : 'Using existing pipeline');
    console.log(' Tools needed:', initialAnalysis.aiResponse.toolsNeeded);

    return result;
  } catch (error) {
    console.error('L Error starting AI session:', error);
    throw new Error(`Failed to start AI session: ${(error as Error).message}`);
  }
}