import { db } from '../../config/firestore';
import { ContactOpportunity, ContactOpportunitySummary } from '../types/contactOpportunityTypes';
import { FullOpportunityData } from '../types/opportunityTypes';

export const manageContactOpportunityService = {
  // Create a contact opportunity record when an opportunity is created
  async createContactOpportunity(
    userId: string, 
    opportunity: FullOpportunityData, 
    pipelineName: string, 
    stageName: string
  ): Promise<void> {
    if (!opportunity.contactId) {
      console.log('No contactId provided for opportunity, skipping contact opportunity creation');
      return;
    }

    const contactOpportunity: ContactOpportunity = {
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      pipelineId: opportunity.pipelineId,
      pipelineName: pipelineName,
      stageId: opportunity.stageId,
      stageName: stageName,
      value: opportunity.value,
      priority: opportunity.priority || 'medium',
      source: opportunity.source,
      status: 'active', // New opportunities are active by default
      dateCreated: opportunity.dateCreated,
      lastModified: opportunity.lastModified
    };

    try {
      const contactOpportunityRef = db.doc(
        `tenants/${userId}/contacts/${opportunity.contactId}/opportunities/${opportunity.id}`
      );
      await contactOpportunityRef.set(contactOpportunity);
      console.log(`Created contact opportunity record for contact ${opportunity.contactId}`);
    } catch (error) {
      console.error('Error creating contact opportunity record:', error);
      // Don't throw error to avoid breaking opportunity creation
    }
  },

  // Update contact opportunity when opportunity is updated
  async updateContactOpportunity(
    userId: string, 
    opportunity: FullOpportunityData, 
    pipelineName?: string, 
    stageName?: string
  ): Promise<void> {
    if (!opportunity.contactId) {
      console.log('No contactId provided for opportunity, skipping contact opportunity update');
      return;
    }

    const updateData: Partial<ContactOpportunity> = {
      opportunityName: opportunity.name,
      pipelineId: opportunity.pipelineId,
      stageId: opportunity.stageId,
      value: opportunity.value,
      priority: opportunity.priority || 'medium',
      source: opportunity.source,
      lastModified: opportunity.lastModified
    };

    // Add pipeline and stage names if provided
    if (pipelineName) updateData.pipelineName = pipelineName;
    if (stageName) updateData.stageName = stageName;

    try {
      const contactOpportunityRef = db.doc(
        `tenants/${userId}/contacts/${opportunity.contactId}/opportunities/${opportunity.id}`
      );
      await contactOpportunityRef.update(updateData);
      console.log(`Updated contact opportunity record for contact ${opportunity.contactId}`);
    } catch (error) {
      console.error('Error updating contact opportunity record:', error);
      // Don't throw error to avoid breaking opportunity update
    }
  },

  // Delete contact opportunity when opportunity is deleted
  async deleteContactOpportunity(userId: string, opportunityId: string, contactId: string): Promise<void> {
    if (!contactId) {
      console.log('No contactId provided for opportunity, skipping contact opportunity deletion');
      return;
    }

    try {
      const contactOpportunityRef = db.doc(
        `tenants/${userId}/contacts/${contactId}/opportunities/${opportunityId}`
      );
      await contactOpportunityRef.delete();
      console.log(`Deleted contact opportunity record for contact ${contactId}`);
    } catch (error) {
      console.error('Error deleting contact opportunity record:', error);
      // Don't throw error to avoid breaking opportunity deletion
    }
  },

  // Move opportunity between contacts (when contact is changed)
  async moveOpportunityBetweenContacts(
    userId: string, 
    opportunityId: string, 
    oldContactId: string, 
    newContactId: string, 
    opportunity: FullOpportunityData,
    pipelineName: string,
    stageName: string
  ): Promise<void> {
    try {
      // Delete from old contact
      if (oldContactId) {
        await this.deleteContactOpportunity(userId, opportunityId, oldContactId);
      }

      // Create for new contact
      if (newContactId) {
        await this.createContactOpportunity(userId, opportunity, pipelineName, stageName);
      }
    } catch (error) {
      console.error('Error moving opportunity between contacts:', error);
    }
  },

  // Get all opportunities for a specific contact
  async getContactOpportunities(userId: string, contactId: string): Promise<ContactOpportunity[]> {
    try {
      const opportunitiesSnapshot = await db
        .collection(`tenants/${userId}/contacts/${contactId}/opportunities`)
        .orderBy('dateCreated', 'desc')
        .get();

      return opportunitiesSnapshot.docs.map(doc => ({
        ...doc.data()
      })) as ContactOpportunity[];
    } catch (error) {
      console.error('Error fetching contact opportunities:', error);
      return [];
    }
  },

  // Get contact opportunity summary
  async getContactOpportunitySummary(userId: string, contactId: string): Promise<ContactOpportunitySummary> {
    try {
      const opportunities = await this.getContactOpportunities(userId, contactId);
      
      const summary: ContactOpportunitySummary = {
        contactId,
        totalOpportunities: opportunities.length,
        totalValue: opportunities.reduce((sum, opp) => sum + opp.value, 0),
        activeOpportunities: opportunities.filter(opp => opp.status === 'active').length,
        wonOpportunities: opportunities.filter(opp => opp.status === 'won').length,
        lostOpportunities: opportunities.filter(opp => opp.status === 'lost').length,
        opportunities
      };

      return summary;
    } catch (error) {
      console.error('Error calculating contact opportunity summary:', error);
      return {
        contactId,
        totalOpportunities: 0,
        totalValue: 0,
        activeOpportunities: 0,
        wonOpportunities: 0,
        lostOpportunities: 0,
        opportunities: []
      };
    }
  },

  // Update opportunity status (won, lost, closed)
  async updateOpportunityStatus(
    userId: string, 
    contactId: string, 
    opportunityId: string, 
    status: 'active' | 'won' | 'lost' | 'closed'
  ): Promise<void> {
    if (!contactId) return;

    try {
      const contactOpportunityRef = db.doc(
        `tenants/${userId}/contacts/${contactId}/opportunities/${opportunityId}`
      );
      await contactOpportunityRef.update({
        status,
        lastModified: new Date().toISOString()
      });
      console.log(`Updated opportunity status to ${status} for contact ${contactId}`);
    } catch (error) {
      console.error('Error updating opportunity status:', error);
    }
  },

  // Batch update opportunities for a contact (useful for cleanup operations)
  async batchUpdateContactOpportunities(
    userId: string, 
    contactId: string, 
    updates: { opportunityId: string; updateData: Partial<ContactOpportunity> }[]
  ): Promise<void> {
    if (!contactId || updates.length === 0) return;

    const batch = db.batch();

    try {
      updates.forEach(({ opportunityId, updateData }) => {
        const contactOpportunityRef = db.doc(
          `tenants/${userId}/contacts/${contactId}/opportunities/${opportunityId}`
        );
        batch.update(contactOpportunityRef, {
          ...updateData,
          lastModified: new Date().toISOString()
        });
      });

      await batch.commit();
      console.log(`Batch updated ${updates.length} opportunities for contact ${contactId}`);
    } catch (error) {
      console.error('Error batch updating contact opportunities:', error);
    }
  },

  // Find the most recent opportunity ID for a contact
  async findLatestOpportunityId(userId: string, contactId: string): Promise<string | null> {
    try {
      // Get all opportunities for the contact (already sorted by dateCreated DESC)
      const opportunities = await this.getContactOpportunities(userId, contactId);

      // Return the first active opportunity's ID
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
      console.error(`Error finding latest opportunity ID for contact ${contactId}:`, error);
      return null;
    }
  }
};