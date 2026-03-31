/**
 * Script to create the Milestone Runner workflow in n8n
 * This workflow is reused for all calendar event milestones
 *
 * Run with: npx ts-node src/calendars/autonCalendar/scripts/createMilestoneRunnerWorkflow.ts
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;
const BACKEND_API_URL = process.env.API_URL || 'http://localhost:8000';

// Service key for n8n -> backend authentication
// IMPORTANT: After seeding, add this key to n8n as an environment variable or credential
const MILESTONE_SERVICE_KEY = process.env.MILESTONE_SERVICE_KEY || 'e22b4ddbce841b331fb1fbc70f058e006c68755e44e6d5753ddf3ec501703c3b';

interface WorkflowData {
  name: string;
  nodes: any[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
}

async function createMilestoneRunnerWorkflow() {
  console.log('🚀 Creating Milestone Runner Workflow in n8n...\n');

  // Define the workflow
  const workflowData: WorkflowData = {
    name: 'Calendar Event - Milestone Runner',
    nodes: [
      // 1. Webhook Trigger Node
      {
        parameters: {
          httpMethod: 'POST',
          path: 'calendar-milestone-runner',
          responseMode: 'responseNode',
          options: {}
        },
        id: 'webhook-trigger',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1.1,
        position: [240, 300],
        webhookId: 'calendar-milestone-runner'
      },

      // 2. Wait Node (wait until milestone execution time)
      {
        parameters: {
          resume: 'specificTime',
          dateTime: '={{ $json.body.dueAtUtc }}'
        },
        id: 'wait-until-due',
        name: 'Wait Until Due Time',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1.1,
        position: [460, 300],
        webhookId: undefined
      },

      // 3. HTTP Request - POST milestone callback to backend
      {
        parameters: {
          url: `${BACKEND_API_URL}/api/event-lifecycle/milestone`,
          method: 'POST',
          authentication: 'none',
          sendBody: true,
          specifyBody: 'keypair',
          bodyParameters: {
            parameters: [
              { name: 'tenantId', value: '={{ $json.body.tenantId }}' },
              { name: 'eventId', value: '={{ $json.body.eventId }}' },
              { name: 'calendarId', value: '={{ $json.body.calendarId }}' },
              { name: 'milestoneId', value: '={{ $json.body.milestoneId }}' },
              { name: 'milestone', value: '={{ $json.body.milestone }}' },
              { name: 'stateHolderTimestamp', value: '={{ $json.body.appointmentTime }}' },
              { name: 'attendeeIds', value: '={{ $json.body.attendeeIds || [] }}' },
              { name: 'primaryContactId', value: '={{ $json.body.primaryContactId || null }}' },
              { name: 'primaryAttendeeId', value: '={{ $json.body.primaryAttendeeId || null }}' },
              { name: 'contactId', value: '={{ $json.body.contactId || null }}' }
            ]
          },
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: 'X-Milestone-Service-Key', value: MILESTONE_SERVICE_KEY }
            ]
          },
          options: {
            timeout: 10000,
            retry: {
              enabled: true,
              maxRetries: 3,
              waitBetween: 2000
            }
          }
        },
        id: 'post-milestone',
        name: 'POST Milestone to Backend',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.1,
        position: [680, 300],
        continueOnFail: true
      },

      // 4. IF Node - Check if HTTP request succeeded
      {
        parameters: {
          conditions: {
            boolean: [
              {
                value1: '={{ $json.error }}',
                value2: '',
                operation: 'notEqual'
              }
            ]
          }
        },
        id: 'check-if-failed',
        name: 'Check If Failed',
        type: 'n8n-nodes-base.if',
        typeVersion: 2,
        position: [900, 300]
      },

      // 5. Error Handler - Log failure (TRUE branch)
      {
        parameters: {
          operation: 'log',
          message: `=Milestone execution failed for {{ $json.body.eventId }}:\nMilestone: {{ $json.body.milestone }}\nError: {{ $json.error }}`,
          level: 'error'
        },
        id: 'log-failure',
        name: 'Log Failure',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [1120, 200]
      },

      // 6. Success Handler (FALSE branch)
      {
        parameters: {
          respondWith: 'json',
          responseBody: JSON.stringify({
            success: true,
            message: 'Milestone processed successfully'
          }, null, 2)
        },
        id: 'respond-success',
        name: 'Respond Success',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [1120, 400]
      }
    ],

    connections: {
      'Webhook Trigger': {
        main: [[{ node: 'Wait Until Due Time', type: 'main', index: 0 }]]
      },
      'Wait Until Due Time': {
        main: [[{ node: 'POST Milestone to Backend', type: 'main', index: 0 }]]
      },
      'POST Milestone to Backend': {
        main: [[{ node: 'Check If Failed', type: 'main', index: 0 }]]
      },
      'Check If Failed': {
        main: [
          [{ node: 'Log Failure', type: 'main', index: 0 }], // TRUE (error exists)
          [{ node: 'Respond Success', type: 'main', index: 0 }] // FALSE (no error)
        ]
      }
    },

    settings: {
      executionOrder: 'v1'
    }
  };

  try {
    console.log('📝 Workflow Definition:');
    console.log(`   Name: ${workflowData.name}`);
    console.log(`   Nodes: ${workflowData.nodes.length}`);
    console.log(`   Backend URL: ${BACKEND_API_URL}`);
    console.log('');

    // Create workflow in n8n
    const response = await axios.post(
      `${N8N_BASE_URL}/workflows`,
      workflowData,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Workflow created successfully!\n');
    console.log('📋 Workflow Details:');
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Active: ${response.data.active}`);
    console.log('');

    // Activate the workflow
    console.log('🔄 Activating workflow...');

    try {
      await axios.post(
        `${N8N_BASE_URL}/workflows/${response.data.id}/activate`,
        {},
        {
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY
          }
        }
      );
      console.log('✅ Workflow activated!\n');
    } catch (activationError) {
      console.log('⚠️  Auto-activation not supported by this n8n version.');
      console.log('   Please activate the workflow manually in the n8n UI.\n');
    }

    // Display instructions
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('1. Add this to your .env file:');
    console.log('');
    console.log(`   N8N_MILESTONE_RUNNER_WORKFLOW_ID=${response.data.id}`);
    console.log('');
    console.log('2. Update createMilestone.ts line 33:');
    console.log('');
    console.log(`   const MILESTONE_RUNNER_WORKFLOW_ID = '${response.data.id}';`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Failed to create workflow in n8n:');
      console.error('   Status:', error.response?.status);
      console.error('   Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('   Message:', error.message);
      throw error;
    }
    throw error;
  }
}

// Run the script
createMilestoneRunnerWorkflow()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
