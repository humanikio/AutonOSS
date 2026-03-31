/**
 * Utility to find the most recent opportunity ID for a given contact
 * Returns the opportunityId of the most recently created active opportunity
 */

import { manageContactOpportunityService } from '../services /manageContactOpportunity';

/**
 * Finds the most recent active opportunity ID for a contact
 *
 * @param tenantId - The tenant ID
 * @param contactId - The contact ID to find opportunities for
 * @returns The opportunityId of the most recent opportunity, or null if none found
 */
export async function findOppId4ContactId(
  tenantId: string,
  contactId: string
): Promise<string | null> {
  try {
    // Get all opportunities for the contact (already sorted by dateCreated DESC)
    const opportunities = await manageContactOpportunityService.getContactOpportunities(
      tenantId,
      contactId
    );

    // Return the first opportunity's ID (most recent)
    // Filter for active opportunities only
    const activeOpportunity = opportunities.find(opp => opp.status === 'active');

    if (activeOpportunity) {
      return activeOpportunity.opportunityId;
    }

    // If no active opportunities, return the most recent one regardless of status
    if (opportunities.length > 0) {
      return opportunities[0].opportunityId;
    }

    // No opportunities found for this contact
    return null;
  } catch (error) {
    console.error(`Error finding opportunity ID for contact ${contactId}:`, error);
    throw new Error(`Failed to find opportunity for contact: ${contactId}`);
  }
}
