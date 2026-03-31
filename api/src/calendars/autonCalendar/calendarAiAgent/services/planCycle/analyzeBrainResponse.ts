/**
 * Analyze Brain Response
 * Parses brain's JSON response and creates sequential toDos
 */

import { BrainResponse } from './brain';
import { createToDo } from '../../state/todoManager';
import { updateCycle } from '../../state/cycles/updateCycle';

export interface AnalyzeBrainResponseInput {
  tenantId: string;
  cycleId: string;
  brainResponse: BrainResponse;
}

/**
 * Analyze brain response and create toDo queue
 * Creates todos sequentially (todo_1, todo_2, etc.)
 * Updates cycle with total todos and sets currentToDo to first one
 *
 * @param input - Analysis input
 * @returns Number of todos created
 */
export async function analyzeBrainResponse(
  input: AnalyzeBrainResponseInput
): Promise<number> {
  try {
    const { tenantId, cycleId, brainResponse } = input;

    console.log(`= Analyzing brain response for cycle ${cycleId}`);

    // Check if there are any tools to process
    if (!brainResponse.tools || brainResponse.tools.length === 0) {
      console.log(`  No tools identified - conversation only`);

      // Update cycle to indicate no todos
      await updateCycle(tenantId, cycleId, {
        totalToDos: 0,
        currentToDo: null
      });

      return 0;
    }

    console.log(`  Creating ${brainResponse.tools.length} todo(s)...`);

    // Create todos for each tool
    for (let i = 0; i < brainResponse.tools.length; i++) {
      const tool = brainResponse.tools[i];

      console.log(`    Creating todo ${i + 1}: ${tool.toolName} - ${tool.intent}`);

      await createToDo(tenantId, cycleId, {
        toolName: tool.toolName,
        intent: tool.intent,
        context: tool.context
      });
    }

    // Update cycle's currentToDo to first todo
    await updateCycle(tenantId, cycleId, {
      currentToDo: 'todo_1'
    });

    console.log(` Created ${brainResponse.tools.length} todo(s), starting with todo_1`);

    return brainResponse.tools.length;
  } catch (error) {
    console.error('L Error analyzing brain response:', error);
    throw new Error('Failed to analyze brain response');
  }
}

/**
 * Extract summary from brain response
 * Useful for logging and debugging
 *
 * @param brainResponse - Brain response to summarize
 * @returns Summary object
 */
export function summarizeBrainResponse(brainResponse: BrainResponse): {
  message: string;
  toolCount: number;
  tools: string[];
} {
  return {
    message: brainResponse.message,
    toolCount: brainResponse.tools.length,
    tools: brainResponse.tools.map(t => `${t.toolName} (${t.intent})`)
  };
}
