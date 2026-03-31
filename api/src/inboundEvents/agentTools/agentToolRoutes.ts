import { Router } from 'express';
import { validateAgentToolsApiKey } from '../../middleware/validateAgentToolsApiKey';
import { executeAgentToolController } from './agentToolsController';

const router = Router();

/**
 * Agent Tools Inbound Webhook Routes
 *
 * These routes handle incoming webhook calls from 11Labs when agent tools are invoked.
 * Authentication is handled via validateAgentToolsApiKey middleware.
 *
 * All routes are protected by:
 * - Authorization: Bearer <ELEVENLABS_AGENT_TOOLS_API_KEY>
 * - Required headers: X-Tenant-Id, X-Agent-Id, X-Tool-Id
 */

// Apply validation middleware to all routes
router.use(validateAgentToolsApiKey);

// POST /api/agent-tools/execute - Execute agent tool (triggers workflow)
router.post('/execute', executeAgentToolController);

export default router;
