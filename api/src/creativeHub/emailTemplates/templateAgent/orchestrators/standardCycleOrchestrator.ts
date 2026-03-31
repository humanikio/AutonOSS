import { AgentBrainOutput } from '../services/agentBrain';
import { updateCycle } from '../services/cycleManager';
import { createTask, TaskType, readTask, updateTask, getPendingTasks, setActiveTaskId } from '../services/taskManager';
import { generateImages } from '../services/generateImages';
import { generateHtml } from '../services/generateHtml';
import { addMessage2chat } from '../tools/addMessage2chat';

export interface OrchestratorInput {
  tenantId: string;
  templateId: string;
  cycleId: string;
  agentBrainResult: AgentBrainOutput;
}

export interface OrchestratorOutput {
  tasksCreated: number;
  activeTaskId: string | null;
  toolTypes: TaskType[];
}

/**
 * Task priority configuration
 * First task (highest priority) is always made active
 */

/**
 * Sort tools by priority
 * imageGeneration (100) > clarification (90) > htmlGeneration (50)
 */
function sortToolsByPriority(
  tools: Array<{ tool: string; parameters: Record<string, any> }>
): Array<{ tool: string; parameters: Record<string, any>; priority: number }> {
  const priorityMap: Record<string, number> = {
    generateImage: 100,
    clarification: 90,
    generateHtml: 50
  };

  return tools
    .map(tool => ({
      ...tool,
      priority: priorityMap[tool.tool] || 0
    }))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Map brain tool names to task types
 */
function mapToolToTaskType(toolName: string): TaskType {
  const mapping: Record<string, TaskType> = {
    generateImage: 'imageGeneration',
    generateHtml: 'htmlGeneration',
    clarification: 'clarification'
  };

  return mapping[toolName] || 'clarification';
}

/**
 * Standard Cycle Orchestrator
 *
 * Coordinates the workflow after the brain has thought:
 * 1. Marks brain thinking as complete in cycle
 * 2. Creates tasks based on tools requested by brain
 * 3. Executes tasks sequentially until all complete
 * 4. Manages task state transitions (pending → in_progress → completed/failed)
 * 5. Marks cycle as complete when all tasks done
 *
 * @param input - Orchestrator input with brain results
 * @returns Orchestrator output with tasks created
 */
export async function runStandardCycleOrchestrator(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const { tenantId, templateId, cycleId, agentBrainResult } = input;

  console.log('\n========================================');
  console.log('[Standard Cycle Orchestrator] START');
  console.log('========================================');
  console.log(`[Standard Cycle Orchestrator] Cycle ID: ${cycleId}`);

  try {
    // Step 1: Mark brain thinking as complete
    console.log('[Standard Cycle Orchestrator] Step 1: Marking brain thinking complete');
    await updateCycle(tenantId, templateId, cycleId, {
      brainThinkingComplete: true
    });
    console.log('[Standard Cycle Orchestrator] ✓ Brain thinking marked complete');

    // Step 2: Sort tools by priority and create tasks
    const tools = agentBrainResult.cyclePlan.parsedResponse.tools;
    const sortedTools = sortToolsByPriority(tools);

    console.log('[Standard Cycle Orchestrator] Step 2: Creating tasks from brain tools');
    console.log(`[Standard Cycle Orchestrator] Tools to process: ${sortedTools.length}`);
    sortedTools.forEach((tool, idx) => {
      console.log(`  ${idx + 1}. ${tool.tool} (priority: ${tool.priority})`);
    });

    const createdTasks: string[] = [];
    const toolTypes: TaskType[] = [];
    let firstActiveTask: string | null = null;

    for (let i = 0; i < sortedTools.length; i++) {
      const tool = sortedTools[i];
      const taskType = mapToolToTaskType(tool.tool);
      toolTypes.push(taskType);

      // Only the FIRST task (highest priority) gets makeActiveTask=true
      const shouldBeActive = firstActiveTask === null;

      console.log(
        `[Standard Cycle Orchestrator] Creating ${taskType} task (makeActive: ${shouldBeActive})`
      );

      const task = await createTask({
        tenantId,
        templateId,
        cycleId,
        type: taskType,
        parameters: tool.parameters,
        makeActiveTask: shouldBeActive
      });

      createdTasks.push(task.id);

      if (shouldBeActive) {
        firstActiveTask = task.id;
        console.log(`[Standard Cycle Orchestrator]   Active task set to: ${task.id}`);
      } else {
        console.log(`[Standard Cycle Orchestrator]   Task created: ${task.id}`);
      }
    }

    console.log('[Standard Cycle Orchestrator] ✓ All tasks created');
    console.log(`[Standard Cycle Orchestrator] Total tasks: ${createdTasks.length}`);

    // Step 3: Execute tasks sequentially until all complete
    console.log('[Standard Cycle Orchestrator] Step 3: Executing tasks...');

    let currentActiveTaskId = firstActiveTask;

    while (currentActiveTaskId) {
      const activeTask = await readTask(tenantId, templateId, cycleId, currentActiveTaskId);

      if (!activeTask) {
        console.log('[Standard Cycle Orchestrator] ⚠️ Active task not found, checking for pending tasks...');
        break;
      }

      console.log(`[Standard Cycle Orchestrator] → Executing ${activeTask.type} task: ${currentActiveTaskId}`);

      // Execute task based on type
      try {
        switch (activeTask.type) {
          case 'imageGeneration': {
            // Update cycle activity before starting
            await updateCycle(tenantId, templateId, cycleId, {
              currentActivity: 'generating_image',
              currentActivityLabel: 'Generating your image...'
            });

            const imageResult = await generateImages({
              tenantId,
              templateId,
              cycleId,
              taskId: currentActiveTaskId
            });

            console.log('[Standard Cycle Orchestrator] ✓ Image generation completed');
            console.log(`[Standard Cycle Orchestrator]   Images: ${imageResult.imagesGenerated}`);

            // Update task to completed
            await updateTask({
              tenantId,
              templateId,
              cycleId,
              taskId: imageResult.taskId,
              status: 'completed',
              result: imageResult.result
            });
            console.log('[Standard Cycle Orchestrator] ✓ Task marked as completed');

            // Add to cycle completedTasks
            await updateCycle(tenantId, templateId, cycleId, {
              addCompletedTask: imageResult.taskId
            });
            console.log('[Standard Cycle Orchestrator] ✓ Task added to completedTasks');

            // Add chat message
            await addMessage2chat({
              tenantId,
              templateId,
              cycleId,
              role: 'assistant',
              content: `✓ **Image generated successfully!** I've created ${imageResult.imagesGenerated} image(s) for your email template.`,
              metadata: {
                taskId: imageResult.taskId,
                taskType: 'imageGeneration',
                imageIds: imageResult.imageIds,
                imageUrls: imageResult.imageUrls
              }
            });
            console.log('[Standard Cycle Orchestrator] ✓ Chat message added');
            break;
          }

          case 'htmlGeneration': {
            // Update cycle activity before starting
            await updateCycle(tenantId, templateId, cycleId, {
              currentActivity: 'generating_html',
              currentActivityLabel: 'Creating your email template...'
            });

            const htmlResult = await generateHtml({
              tenantId,
              templateId,
              cycleId,
              taskId: currentActiveTaskId
            });

            console.log('[Standard Cycle Orchestrator] ✓ HTML generation completed');
            console.log(`[Standard Cycle Orchestrator]   HTML length: ${htmlResult.html.length} characters`);

            // Update task to completed
            await updateTask({
              tenantId,
              templateId,
              cycleId,
              taskId: htmlResult.taskId,
              status: 'completed',
              result: htmlResult.result
            });
            console.log('[Standard Cycle Orchestrator] ✓ Task marked as completed');

            // Add to cycle completedTasks
            await updateCycle(tenantId, templateId, cycleId, {
              addCompletedTask: htmlResult.taskId
            });
            console.log('[Standard Cycle Orchestrator] ✓ Task added to completedTasks');

            // Add chat message with the assistant's message
            await addMessage2chat({
              tenantId,
              templateId,
              cycleId,
              role: 'assistant',
              content: htmlResult.assistantMessage,
              metadata: {
                taskId: htmlResult.taskId,
                taskType: 'htmlGeneration',
                htmlLength: htmlResult.html.length
              }
            });
            console.log('[Standard Cycle Orchestrator] ✓ Chat message added');
            break;
          }

          case 'clarification': {
            console.log('[Standard Cycle Orchestrator] → Clarification task (BLOCKING)');
            console.log('[Standard Cycle Orchestrator]   Brain has requested clarification from user');
            console.log('[Standard Cycle Orchestrator]   Questions already added to chat via initialResponse');

            // The brain's initialResponse already contains the formatted questions
            // They were added to chat in the controller (line 134)
            // This tool is just a signal to STOP and mark cycle as complete

            // Type guard - we know currentActiveTaskId is not null here (we're in the while loop)
            if (!currentActiveTaskId) {
              console.log('[Standard Cycle Orchestrator] ⚠️ No active task ID for clarification');
              break;
            }

            // Mark clarification task as completed
            await updateTask({
              tenantId,
              templateId,
              cycleId,
              taskId: currentActiveTaskId,
              status: 'completed',
              result: {
                message: 'Clarification requested - waiting for user response'
              }
            });
            console.log('[Standard Cycle Orchestrator] ✓ Clarification task marked as completed');

            // Add to cycle completedTasks
            await updateCycle(tenantId, templateId, cycleId, {
              addCompletedTask: currentActiveTaskId
            });
            console.log('[Standard Cycle Orchestrator] ✓ Task added to completedTasks');

            // Clarification is BLOCKING - stop processing and complete cycle
            console.log('[Standard Cycle Orchestrator] ⏸ Clarification is BLOCKING');
            console.log('[Standard Cycle Orchestrator]   Cycle will complete - waiting for user to respond');

            // Break out of loop to complete the cycle
            currentActiveTaskId = null;
            break;
          }

          default:
            console.log(`[Standard Cycle Orchestrator] ⚠️ Unknown task type: ${activeTask.type}`);
            break;
        }
      } catch (taskError) {
        console.error(`[Standard Cycle Orchestrator] ❌ Task execution failed:`, taskError);

        // Type guard - only mark as failed if we have a valid task ID
        if (currentActiveTaskId) {
          // Mark task as failed
          await updateTask({
            tenantId,
            templateId,
            cycleId,
            taskId: currentActiveTaskId,
            status: 'failed',
            error: taskError instanceof Error ? taskError.message : 'Unknown error'
          });
          console.log('[Standard Cycle Orchestrator] ✓ Task marked as failed');
        } else {
          console.log('[Standard Cycle Orchestrator] ⚠️ No task ID to mark as failed');
        }

        // Don't add to completedTasks - task failed
        // Continue to next task
      }

      // Check for pending tasks
      console.log('[Standard Cycle Orchestrator] Checking for pending tasks...');
      const pendingTasks = await getPendingTasks(tenantId, templateId, cycleId);

      if (pendingTasks.length === 0) {
        console.log('[Standard Cycle Orchestrator] ✓ No pending tasks - all complete');

        // Mark cycle as complete and clear activity
        await updateCycle(tenantId, templateId, cycleId, {
          status: 'completed',
          currentActivity: null,
          currentActivityLabel: null
        });
        console.log('[Standard Cycle Orchestrator] ✓ Cycle marked as completed');

        currentActiveTaskId = null;
        break;
      }

      // Set next pending task as active
      const nextTask = pendingTasks[0]; // Highest priority
      console.log(`[Standard Cycle Orchestrator] → Next task: ${nextTask.type} (${nextTask.id})`);

      await setActiveTaskId(tenantId, templateId, cycleId, nextTask.id);
      console.log('[Standard Cycle Orchestrator] ✓ Active task updated');

      currentActiveTaskId = nextTask.id;
    }

    console.log('[Standard Cycle Orchestrator] ✓ COMPLETE');
    console.log('========================================\n');

    return {
      tasksCreated: createdTasks.length,
      activeTaskId: currentActiveTaskId,
      toolTypes
    };
  } catch (error) {
    console.error('[Standard Cycle Orchestrator] ❌ ERROR:', error);
    console.error(
      '[Standard Cycle Orchestrator] Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    console.log('========================================\n');
    throw error;
  }
}
