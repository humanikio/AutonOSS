import { getConfig } from './getConfig';
import { updateConfig } from './updateConfig';

export async function initializeConfig(tenantId: string): Promise<void> {
  const existing = await getConfig(tenantId);

  if (!existing) {
    await updateConfig(tenantId, {
      enableAutoFallback: false,
      createdAt: new Date()
    });
  }
}
