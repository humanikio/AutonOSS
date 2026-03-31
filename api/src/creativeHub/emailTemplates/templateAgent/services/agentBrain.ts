import { prepareData, PreparedData } from './AgentBrain/prepareData';
import { buildPrompt, BuildPromptOutput } from './AgentBrain/buildPrompt';
import { generateCyclePlan, GenerateCyclePlanOutput } from './AgentBrain/generateCyclePlan';

export interface AgentBrainInput {
  tenantId: string;
  templateId: string;
  cycleId: string;
}

export interface AgentBrainOutput {
  preparedData: PreparedData;
  prompt: BuildPromptOutput;
  cyclePlan: GenerateCyclePlanOutput;
  // TODO: Add tool execution results
}

/**
 * Main orchestrator for the agent brain workflow
 *
 * This function coordinates the entire agent process:
 * 1. Prepare data - Read cycle and extract user prompt
 * 2. Build prompt - Compile full LLM prompt with context
 * 3. Generate cycle plan - Call Claude 4 LLM and get structured JSON response
 * 4. Execute tools - Run requested tools (generateImage, generateHtml, clarification)
 *
 * @param input - Object containing tenant, template, and cycle IDs
 * @returns Object containing prepared data, prompt, and execution results
 */
export async function runAgentBrain(input: AgentBrainInput): Promise<AgentBrainOutput> {
  const { tenantId, templateId, cycleId } = input;

  try {
    console.log(`[Agent Brain] Starting workflow for cycle ${cycleId}`);

    // Step 1: Prepare data - get the cycle and extract the user's prompt
    console.log(`[Agent Brain] Step 1: Preparing data...`);
    const preparedData = await prepareData(tenantId, templateId, cycleId);
    console.log(`[Agent Brain] Data prepared. User prompt: "${preparedData.userPrompt.substring(0, 50)}..."`);

    // Step 2: Build prompt - compile the full prompt for the LLM (including chat history and images)
    console.log(`[Agent Brain] Step 2: Building prompt with chat history...`);
    const prompt = await buildPrompt({
      userPrompt: preparedData.userPrompt,
      tenantId,
      templateId,
      cycleId,
      existingImages: preparedData.existingImages,
      currentTemplate: preparedData.currentTemplate
    });
    console.log(`[Agent Brain] Prompt built. Total length: ${prompt.fullPrompt.length} characters`);

    // Step 3: Generate cycle plan - call Claude 4 and get JSON response (with image context)
    console.log(`[Agent Brain] Step 3: Generating cycle plan with Claude 4...`);
    const cyclePlan = await generateCyclePlan({
      fullPrompt: prompt.fullPrompt,
      existingImages: prompt.existingImages
    });
    console.log(`[Agent Brain] ✓ Cycle plan generated successfully!`);
    console.log(`[Agent Brain] Initial Response: "${cyclePlan.parsedResponse.initialResponse.substring(0, 80)}..."`);
    console.log(`[Agent Brain] Tools requested: ${cyclePlan.parsedResponse.tools.map(t => t.tool).join(', ')}`);

    // TODO: Step 4: Execute tools based on the response
    // for (const tool of cyclePlan.parsedResponse.tools) {
    //   if (tool.tool === 'generateImage') { ... }
    //   else if (tool.tool === 'generateHtml') { ... }
    //   else if (tool.tool === 'clarification') { ... }
    // }
    console.log(`[Agent Brain] Step 4: TODO - Execute tools (not implemented yet)`);

    console.log(`[Agent Brain] ✓ Workflow complete for cycle ${cycleId}`);

    return {
      preparedData,
      prompt,
      cyclePlan
      // TODO: Add toolResults
    };
  } catch (error) {
    console.error(`[Agent Brain] Error in workflow:`, error);
    throw new Error(`Agent brain workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
