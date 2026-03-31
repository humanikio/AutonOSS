export interface BotAvatar {
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

export function getAvailableBotColors(): string[] {
  return botAvatars.map(avatar => avatar.color);
}

export function getRandomBotAvatar(): BotAvatar {
  const randomIndex = Math.floor(Math.random() * botAvatars.length);
  return botAvatars[randomIndex];
}

export function getBotAvatarByColor(color: string): BotAvatar | null {
  return botAvatars.find(avatar => avatar.color === color) || null;
}

export function getAllBotAvatars(): BotAvatar[] {
  return [...botAvatars];
}