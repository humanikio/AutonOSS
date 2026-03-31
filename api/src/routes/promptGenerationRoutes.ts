import { Router } from 'express';
import { PromptGenerationController } from '../controllers/promptGenerationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All prompt generation routes require authentication
router.use(authenticateToken);

// Generate complete agent prompt with system prompt and conversation flow
// POST /api/prompt-generation/agent-prompt
router.post('/agent-prompt', PromptGenerationController.generateAgentPrompt);

// Generate just the first message for an agent
// POST /api/prompt-generation/first-message  
router.post('/first-message', PromptGenerationController.generateFirstMessage);

// Get prompt generation templates and suggestions
// GET /api/prompt-generation/templates
router.get('/templates', PromptGenerationController.getPromptTemplates);

// Validate a prompt request before generation
// POST /api/prompt-generation/validate
router.post('/validate', PromptGenerationController.validatePromptRequest);

export default router;