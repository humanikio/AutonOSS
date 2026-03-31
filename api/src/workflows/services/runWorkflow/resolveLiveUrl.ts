import { Workflow } from '../../types';

/**
 * Resolves the production webhook URL for a workflow
 *
 * @param workflow - The workflow to get the production URL for
 * @returns Production webhook URL
 * @throws Error if no production webhook URL is found
 */
export const resolveLiveUrl = (workflow: Workflow): string => {
  // Extract webhook trigger from n8n config
  const webhookTrigger = workflow.triggers?.find(
    (t) => t.triggerType === 'webhook' && t.url
  );

  if (!webhookTrigger?.url) {
    throw new Error(
      `No production webhook URL found for workflow "${workflow.name}" (${workflow.id}). ` +
      'Make sure the workflow is published and has been synced to n8n.'
    );
  }

  console.log(` Resolved production URL for workflow "${workflow.name}": ${webhookTrigger.url}`);
  return webhookTrigger.url;
};
