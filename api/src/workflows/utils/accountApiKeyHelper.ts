/**
 * Account API Key Helper
 * Ensures every tenant has an active account service key for workflow automation
 * Automatically creates one if it doesn't exist
 */

import { getAccountApiKey } from '../../apiKeys/services/apiKeysCrudManager/getAccountApiKey';
import { createApiKey } from '../../apiKeys/services/apiKeysCrudManager/createApiKey';

/**
 * Get or create an account service key for a tenant
 * This key is used for workflow automation and n8n integration
 *
 * @param tenantId - The tenant ID
 * @param userId - The user ID creating the key (if needed)
 * @returns Full API key in format: plkey_xxx.plsec_yyy
 */
export async function getOrCreateAccountApiKey(
  tenantId: string,
  userId: string
): Promise<string> {
  try {
    // Step 1: Try to get existing account key
    console.log(`= Checking for existing account API key for tenant ${tenantId}`);
    const existingKey = await getAccountApiKey(tenantId);

    if (existingKey) {
      console.log(` Found existing account API key for tenant ${tenantId}`);
      return existingKey;
    }

    // Step 2: No account key exists, create one automatically
    console.log(`=Ý No account key found, creating new account service key for tenant ${tenantId}`);
    const { fullKey } = await createApiKey(
      tenantId,
      userId,
      {
        name: 'Account Service Key',
        environment: 'live',
        isAccountKey: true, // This flag ensures it's saved as the account key
        scopes: [] // Default scopes, can be expanded later
      }
    );

    console.log(` Created new account API key for tenant ${tenantId}`);
    return fullKey;

  } catch (error) {
    console.error(`L Failed to get or create account API key for tenant ${tenantId}:`, error);
    throw new Error(`Failed to get or create account API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
