import { manageContactsService } from '../../../../../contacts/services/ManageContacts';

export interface ResolveVariablesRequest {
  tenantId: string;
  contactId: string;
  variableNames: string[];  // Variable names extracted from template
}

export interface ResolveVariablesResponse {
  resolved: Record<string, any>;  // Map of variable name to value
  notFound: string[];             // Variables that couldn't be resolved
}

class ResolveCustomVariables {
  /**
   * Fetches contact data and maps variable names to their values
   * Uses the flattened contact format for easy key-value access
   */
  async resolve(request: ResolveVariablesRequest): Promise<ResolveVariablesResponse> {
    try {
      console.log(`=🔗 Resolving ${request.variableNames.length} variable(s) for contact ${request.contactId}`);

      // If no variables to resolve, return early
      if (request.variableNames.length === 0) {
        return {
          resolved: {},
          notFound: []
        };
      }

      // Fetch flattened contact data
      const contactData = await manageContactsService.getContactFlattened(
        request.tenantId,
        request.contactId
      );

      console.log(`✓ Retrieved contact data with ${Object.keys(contactData).length} fields`);

      const resolved: Record<string, any> = {};
      const notFound: string[] = [];

      // Map each variable name to its value in contact data
      for (const variableName of request.variableNames) {
        // Try exact match first
        if (variableName in contactData && contactData[variableName] !== undefined) {
          resolved[variableName] = contactData[variableName];
          console.log(`✓ Matched "${variableName}" = "${contactData[variableName]}"`);
        } else {
          // Try case-insensitive match
          const lowerVariableName = variableName.toLowerCase();
          const matchedKey = Object.keys(contactData).find(
            key => key.toLowerCase() === lowerVariableName
          );

          if (matchedKey && contactData[matchedKey] !== undefined) {
            resolved[variableName] = contactData[matchedKey];
            console.log(`✓ Matched "${variableName}" (case-insensitive) = "${contactData[matchedKey]}"`);
          } else {
            // Variable not found in contact data - will be replaced with empty string
            notFound.push(variableName);
            resolved[variableName] = null;
            console.log(`⚠️  Variable "${variableName}" not found in contact data`);
          }
        }
      }

      console.log(`=🔗 Resolved ${Object.keys(resolved).length - notFound.length}/${request.variableNames.length} variable(s)`);

      return {
        resolved,
        notFound
      };

    } catch (error) {
      console.error('❌ Error resolving custom variables:', error);
      throw new Error(`Failed to resolve custom variables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const resolveCustomVariables = new ResolveCustomVariables();
