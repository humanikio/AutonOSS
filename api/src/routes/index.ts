import { Router } from 'express';
import authRoutes from './auth';
import agentRoutes from './agents';
import contactRoutes from './contacts';
import conversationRoutes from './conversations';
import businessRoutes from './business';
import webhookRoutes from './webhooks';
import knowledgeRoutes from './knowledgeRoutes';
import callAgentRoutes from './callAgentRoutes';
import voiceRoutes from './voiceRoutes';
import syncRoutes from './syncRoutes';
import customToolRoutes from './customToolRoutes';
import { editAgentRoutes } from './editAgentRoutes';
import callAnalyticsRoutes from './callAnalyticsRoutes';
import promptGenerationRoutes from './promptGenerationRoutes';
import kbRoutes from '../KnowledgeBaseDocuments/routes/kbRoutes';
import kbChatRoutes from '../KnowledgeBaseDocuments/routes/kbChatRoute';
import phoneNumberRoutes from '../phoneNumbers/routes/phoneNumberRoutes';
import inboundSmsRoutes from '../inboundEvents/sms/routes/inboundSmsRoutes';
import inboundN8nRoutes from '../inboundEvents/n8n/routes/inboundN8nRoutes';
import mailgunInboundRoutes from '../inboundEvents/email/mailgun/routes/mailgunInboundRoute';
import adminUpdateSmsRoutes from '../admin/updateInboundSmsRoute/routes/adminUpdateInboundSmsRoutes';
import agentManagementRoutes from '../agents/agentManagement/routes/agentManagementRoutes';
import smsRoutes from '../crm/sms/routes/smsRoute';
import emailRoutes from '../crm/email/routes/emailRoute';
import mailgunRoutes from '../mailgun/routes/mailgunRoute';
import mailgunDomainRoutes from '../mailgun/routes/mailgunDomainRoute';
import domainRoutes from '../domains/routes/domainRoutes';
import googleOauthRoutes from '../oauth/google/routes/googleOauthRoute';
import oauthAccountRoutes from '../oauth/google/routes/accountRoutes';
import emailAccountsRoutes from '../emailAccounts/routes/emailAccountsRoutes';
import ghlOauthRoutes from '../oauth/ghl/routes/ghlOauthRoute';
import ghlWebhookRoutes from '../oauth/ghl/routes/ghlWebhookRoute';
import { agentTrainingRoutes } from '../agentTraining/routes/agentTrainingRoutes';
import smsAgentCommunicationRoutes from '../agentCommunication/sms/routes/smsAgentCommuneRoutes';
import { trainingChatRoutes } from '../agentCommunication/trainingChatManager/routes/trainingChatRoute';
import agentPhoneRoutes from '../agentCommunication/phone/routes/agentPhoneRoutes';
import agentWebhookHandlerRoutes from '../inboundEvents/agentWebhookHandler/routes/agentWebhookHandlerRoutes';
import { totpRoutes } from '../2fa/routes/totpRoutes';
import { smsOtpRoutes } from '../2fa/sms/routes/smsOtpRoutes';
import opportunityRoutes from '../opportunities/routes/opportunitityRoutes';
import aiAssistantRoutes from '../opportunities/aiAssistant/routes/aiOpportunityAgentRoutes';
import automationRoutes from '../automations/routes/automationRoutes';
import workflowRoutes from '../workflows/routes/workflowRoutes';
import userRoutes from '../users/routes/userRoutes';
import invitationRoutes from '../invitations/routes/invitationRoutes';
import destinationHookRoutes from '../agents/agentWebhookSetup/destinationHooks/routes/destinationHookRoutes';
import generalImageGenRoutes from '../imageGeneration/general/routes/generalImageGenRoutes';
import conversationHistoryRoutes from '../universalContactMemory/conversationHistory/routes/conversationHistoryRoute';
import contactProfileRoutes from '../universalContactMemory/contactProfile/routes/contactProfileRoutes';
import universalContactMemoryRoutes from '../universalContactMemory/routes/universalContactMemoryRoutes';
import agentToolsRoutes from '../agents/agentManagement/agentTools/routes/agentToolsRoutes';
import n8nRoutes from '../n8n/routes/n8nRoutes';
import apiKeysRoutes from '../apiKeys/routes/apiKeysRoutes';
import workflowInboundEventsRoutes from '../inboundEvents/workflows/routes/workflowInboundEventsRoutes';
import triggerSubscriptionRoutes from '../workflows/triggerSubscriptions/routes/triggerSubscriptionRoutes';
import emailTemplateRoutes from '../creativeHub/emailTemplates/routes/emailTemplateRoutes';
import templateAgentRoutes from '../creativeHub/emailTemplates/templateAgent/routes/templateAgentRoutes';
import contentStudioRoutes from '../creativeHub/contentStudio/routes/contentStudioRoutes';
import imageLibraryRoutes from '../creativeHub/imageLibrary/routes/imageLibraryRoutes';
import autonCalendarRoutes from '../calendars/autonCalendar/routes/autonCalendarRoutes';
import autonEventLifecycleRoutes from '../calendars/autonCalendar/routes/autonEventLifecycleRoutes';
import calendarAiAgentRoutes from '../calendars/autonCalendar/calendarAiAgent/routes/calendarAiAgentRoutes';
import customFieldsRoutes from '../customFields/routes/customFieldsRoutes';
import aiProcessingRoutes from '../workflows/aiProcessing/routes/aiProcessingRoutes';
import workspaceRoutes from '../workspaces/routes/workspaceRoutes';
import agentToolInboundRoutes from '../inboundEvents/agentTools/agentToolRoutes';

// Import dual authentication middleware
import { authenticateEither } from '../middleware/authenticateEither';

const router = Router();

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

// Authentication routes (login, signup, etc.)
router.use('/auth', authRoutes);

// Webhook routes (external services, no auth required)
router.use('/webhooks', webhookRoutes);
router.use('/inbound-sms', inboundSmsRoutes);
router.use('/webhook/email', mailgunInboundRoutes);
router.use('/ghl', ghlWebhookRoutes);
router.use('/universal-message', agentWebhookHandlerRoutes);
// Phone routes include both public webhooks (post-call, call-initiated) and will have start-call protected below
router.use('/agent-communication/phone', agentPhoneRoutes);

// Workflow inbound events (mixed public/authenticated routes)
router.use('/workflows/inbound-events', workflowInboundEventsRoutes);

// OAuth routes (callbacks from external services)
router.use('/oauth/google', googleOauthRoutes);
router.use('/oauth', oauthAccountRoutes);
router.use('/oauth/location', ghlOauthRoutes);

// Invitation routes (public - users not logged in yet)
router.use('/invitations', invitationRoutes);

// Event lifecycle routes (n8n milestone callbacks - service key auth, NOT user auth)
// This route uses X-Milestone-Service-Key header for authentication
router.use('/event-lifecycle', autonEventLifecycleRoutes);

// Agent tools inbound routes (11Labs webhooks - service key auth, NOT user auth)
// This route uses Authorization: Bearer <ELEVENLABS_AGENT_TOOLS_API_KEY> header
router.use('/agent-tools', agentToolInboundRoutes);


// ============================================================
// APPLY DUAL AUTHENTICATION MIDDLEWARE
// All routes below accept EITHER Firebase JWT OR API Key
// ============================================================
router.use(authenticateEither);

// ============================================================
// PROTECTED ROUTES (Require authentication)
// ============================================================

// Inbound n8n events (requires API key authentication)
router.use('/inbound-n8n', inboundN8nRoutes);

// API Keys management (for creating/managing API keys - requires Firebase JWT)
router.use('/api-keys', apiKeysRoutes);

// Workspaces (requires Firebase JWT only - no API keys)
// Note: workspaceRoutes handles its own auth middleware internally
router.use('/workspaces', workspaceRoutes);

// Core resources
router.use('/contacts', contactRoutes);
router.use('/conversations', conversationRoutes);
router.use('/business', businessRoutes);
router.use('/opportunities', opportunityRoutes);

// Custom fields (tenant-scoped field definitions)
router.use('/customFields', customFieldsRoutes);

// Agent management
router.use('/agents', agentRoutes);
router.use('/call-agents', callAgentRoutes);
router.use('/agent-management', agentManagementRoutes);
router.use('/edit-agents', editAgentRoutes);
router.use('/agent-training', agentTrainingRoutes);
router.use('/agents', agentToolsRoutes);

// Workflows and automation
router.use('/workflows', workflowRoutes);
router.use('/workflows/trigger-subscriptions', triggerSubscriptionRoutes);
router.use('/workflows/ai-processing', aiProcessingRoutes);
router.use('/automations', automationRoutes);
router.use('/n8n', n8nRoutes);

// Communication channels
router.use('/sms', smsRoutes);
router.use('/email', emailRoutes);
router.use('/email-accounts', emailAccountsRoutes);
router.use('/domains', domainRoutes);
router.use('/mailgun/domains', mailgunDomainRoutes);
router.use('/mailgun', mailgunRoutes);
router.use('/voices', voiceRoutes);
router.use('/phone-numbers', phoneNumberRoutes);

// Agent communication (requires authentication for tenantId)
router.use('/agent-communication/sms', smsAgentCommunicationRoutes);

// Knowledge base
router.use('/knowledge', knowledgeRoutes);
router.use('/kb', kbRoutes);
router.use('/kb/chat', kbChatRoutes);

// AI features
router.use('/ai-assistant', aiAssistantRoutes);
router.use('/training-chat', trainingChatRoutes);
router.use('/prompt-generation', promptGenerationRoutes);
router.use('/image-generation', generalImageGenRoutes);

// Analytics and monitoring
router.use('/call-analytics', callAnalyticsRoutes);

// Utilities
router.use('/sync', syncRoutes);
router.use('/custom-tools', customToolRoutes);
router.use('/destination-webhooks', destinationHookRoutes);

// User management
router.use('/users', userRoutes);
router.use('/2fa/totp', totpRoutes);
router.use('/2fa/sms', smsOtpRoutes);

// Admin routes
router.use('/admin/update-sms-route', adminUpdateSmsRoutes);

// Universal contact memory
router.use('/universal-contact-memory/conversation-history', conversationHistoryRoutes);
router.use('/universal-contact-memory/contact-profile', contactProfileRoutes);
router.use('/universal-contact-memory', universalContactMemoryRoutes);

// Creative Hub
router.use('/email-templates', emailTemplateRoutes);
router.use('/template-agent', templateAgentRoutes);
router.use('/content-sessions', contentStudioRoutes);
router.use('/image-library', imageLibraryRoutes);

// Calendar
router.use('/calendars', autonCalendarRoutes);

// Calendar AI Agent (protected with authenticateEither)
router.use('/calendar-agent', calendarAiAgentRoutes);

export default router;