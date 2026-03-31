import { createCaseNumber } from '../../caseNumberManager';
import { CreateCaseRequest } from '../../../types';

/**
 * Generates a new case number and creates the initial case document
 *
 * @param tenantId - Tenant ID
 * @param request - Case creation parameters
 * @returns Generated case ID
 */
export const generateCaseNumberTool = async (
  tenantId: string,
  request: CreateCaseRequest
): Promise<string> => {
  console.log(`=" Generating case number for node ${request.nodeId}...`);

  // Create the case in Firestore
  const newCase = await createCaseNumber(tenantId, request);

  console.log(` Case created: ${newCase.id}`);

  return newCase.id;
};
