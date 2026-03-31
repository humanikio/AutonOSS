import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { createAgentController, getAgentsController, deleteAgentController, manageAgentController, refreshAgentController, updateAgentConfigController, updateAgentKnowledgeBaseController, getSystemPromptController, updateSystemPromptController } from '../controllers/agentManagementController';
import { updateSystemPromptController as updateSystemPromptSimple } from '../controllers/systemPromptController';
import { voiceConfigController, getVoicesController, getVoiceController } from '../controllers/voiceConfigController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all agents for a tenant
router.get('/', getAgentsController);

// Create a new agent
router.post('/create', createAgentController);

// Delete an agent
router.delete('/:agentId', deleteAgentController);

// Manage agent (for updates like phone number assignment)
router.post('/:agentId/manage', manageAgentController);

// Refresh agent configuration from 11Labs
router.post('/:agentId/refresh', refreshAgentController);

// Update agent configuration (bulk update for LLM, TTS, ASR, turn settings)
router.patch('/:agentId/config', updateAgentConfigController);

// Update agent knowledge base documents
router.patch('/:agentId/knowledge-base', updateAgentKnowledgeBaseController);

// Voice Configuration Routes
// POST for complex voice configuration actions
router.post('/:agentId/voice-config', voiceConfigController);

// GET for listing all available voices
router.get('/:agentId/voices', getVoicesController);

// GET for individual voice details
router.get('/:agentId/voices/:voiceId', getVoiceController);

// System Prompt Management Routes (NEW)
// GET agent's internal system prompt
router.get('/:agentId/system-prompt', getSystemPromptController);

// PUT agent's internal system prompt (modern endpoint using SystemPromptService)
router.put('/:agentId/system-prompt', updateSystemPromptController);

// PUT agent's internal system prompt (legacy endpoint - updates main document fields)
router.put('/:agentId/prompt', updateSystemPromptSimple);

export default router;