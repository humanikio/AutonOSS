import { getAccount } from './getAccount';
import { updateConfig } from './updateConfig';

export async function setDefaultAccount(tenantId: string, accountId: string): Promise<void> {
  // Verify the account exists and is active
  const account = await getAccount(tenantId, accountId);

  if (!account) {
    throw new Error(`Email account ${accountId} not found for tenant ${tenantId}`);
  }

  if (account.status !== 'active') {
    throw new Error(`Email account ${accountId} is not active. Status: ${account.status}`);
  }

  // Set as default
  await updateConfig(tenantId, {
    defaultAccountId: accountId,
    preferredProvider: account.provider
  });
}
