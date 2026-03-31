import { firestore } from '../../../../config/firebase';
import { createElevenLabsAgentMapping } from './helpers/createElevenLabsAgentMapping';

interface BotAvatar {
  color: string;
  entityImagePath: string;
  iconImagePath: string;
}

const botAvatars: BotAvatar[] = [
  {
    color: 'blue',
    entityImagePath: '/agentImages/BlueBotEntity.png',
    iconImagePath: '/agentImages/blueBotIcon.png',
  },
  {
    color: 'orange',
    entityImagePath: '/agentImages/OrangeBotEntity.png',
    iconImagePath: '/agentImages/orangeBotIcon.png',
  },
  {
    color: 'red',
    entityImagePath: '/agentImages/RedBotEntity.png',
    iconImagePath: '/agentImages/redBotIcon.png',
  },
  {
    color: 'green',
    entityImagePath: '/agentImages/GreenBotEntity.png',
    iconImagePath: '/agentImages/greenBotIcon.png',
  },
  {
    color: 'yellow',
    entityImagePath: '/agentImages/YellowBotEntity.png',
    iconImagePath: '/agentImages/yellowBotIcon.png',
  },
];

function getRandomBotAvatar(): BotAvatar {
  const randomIndex = Math.floor(Math.random() * botAvatars.length);
  return botAvatars[randomIndex];
}

export async function createNewFirestoreAgentCard(tenantId: string, name: string, agentId: string, elevenLabsAgentId: string, selectedAvatar?: BotAvatar): Promise<void> {
  try {
    
    // Create the agent document in Firestore
    const agentRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId);
    
    // Use provided avatar or select random bot avatar as fallback
    const avatarToUse = selectedAvatar || getRandomBotAvatar();
    
    // Initial agent data
    const agentData = {
      id: agentId,
      name: name,
      description: 'New agent ready for configuration',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      totalInteractions: 0,
      elevenLabsAgentId: elevenLabsAgentId,
      botAvatarColor: avatarToUse.color,
      botEntityImagePath: avatarToUse.entityImagePath,
      botIconImagePath: avatarToUse.iconImagePath,
      // Default system prompt for new agents (stored in Firestore, injected into 11Labs at runtime)
      prompt: `You are ${name}, a helpful and professional AI assistant. You are friendly, knowledgeable, and always aim to provide accurate and helpful information to users. When speaking on the phone, maintain a conversational tone while being clear and concise.

Your key characteristics:
- Professional yet approachable
- Clear and easy to understand  
- Helpful and solution-oriented
- Patient and empathetic

Always aim to assist users with their needs while maintaining a positive and professional demeanor.`,
      // Also store in llmSettings for backward compatibility
      llmSettings: {
        prompt: `You are ${name}, a helpful and professional AI assistant. You are friendly, knowledgeable, and always aim to provide accurate and helpful information to users. When speaking on the phone, maintain a conversational tone while being clear and concise.

Your key characteristics:
- Professional yet approachable
- Clear and easy to understand  
- Helpful and solution-oriented
- Patient and empathetic

Always aim to assist users with their needs while maintaining a positive and professional demeanor.`,
        llm: 'gemini-2.0-flash',
        temperature: 0.25,
        max_tokens: 250
      }
    };
    
    // Save to Firestore
    await agentRef.set(agentData);
    
    console.log(`Created new agent "${name}" with ID: ${agentId} for tenant: ${tenantId}`);
    
    // Create ElevenLabs agent mapping for inbound call resolution
    await createElevenLabsAgentMapping(
      elevenLabsAgentId,
      tenantId,
      agentId,
      name
    );
  } catch (error) {
    console.error('Error creating Firestore agent card:', error);
    throw new Error(`Failed to create Firestore agent card: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}