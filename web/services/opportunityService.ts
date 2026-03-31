import { auth } from '@/lib/firebase/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Interfaces
export interface Opportunity {
  id: string;
  name: string;
  source: string;
  value: number;
  pipelineId: string;
  stageId: string;
  description?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  expectedCloseDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  dateCreated: string;
  createdBy: string;
  lastModified: string;
  stageHistory: OpportunityStageHistory[];
}

export interface OpportunityStageHistory {
  stageId: string;
  stageName: string;
  dateEntered: string;
  durationInStage?: number;
}

export interface CreateOpportunityRequest {
  name: string;
  source: string;
  value?: number;
  pipelineId: string;
  stageId: string;
  description?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  expectedCloseDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface UpdateOpportunityRequest {
  name?: string;
  source?: string;
  value?: number;
  pipelineId?: string;
  stageId?: string;
  description?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  expectedCloseDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface MoveOpportunityRequest {
  pipelineId: string;
  stageId: string;
}

export interface OpportunityFilters {
  pipelineId?: string;
  stageId?: string;
  source?: string;
  priority?: 'low' | 'medium' | 'high';
  minValue?: number;
  maxValue?: number;
  tags?: string[];
  search?: string;
}

export interface OpportunityListResponse {
  opportunities: Opportunity[];
  totalCount: number;
  hasMore: boolean;
}

class OpportunityService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async createOpportunity(opportunityData: CreateOpportunityRequest): Promise<Opportunity> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/opportunities`, {
        method: 'POST',
        headers,
        body: JSON.stringify(opportunityData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create opportunity: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating opportunity:', error);
      throw error;
    }
  }

  async getOpportunity(opportunityId: string): Promise<Opportunity> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/opportunities/${opportunityId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch opportunity: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      throw error;
    }
  }

  async getOpportunities(
    filters: OpportunityFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<OpportunityListResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.pipelineId) queryParams.append('pipelineId', filters.pipelineId);
      if (filters.stageId) queryParams.append('stageId', filters.stageId);
      if (filters.source) queryParams.append('source', filters.source);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.minValue !== undefined) queryParams.append('minValue', filters.minValue.toString());
      if (filters.maxValue !== undefined) queryParams.append('maxValue', filters.maxValue.toString());
      if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach(tag => queryParams.append('tags', tag));
      }
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      const response = await fetch(`${API_BASE_URL}/api/opportunities/opportunities?${queryParams}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        let errorMessage = `Failed to fetch opportunities: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        console.error('Full response:', response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      throw error;
    }
  }

  async updateOpportunity(opportunityId: string, updateData: UpdateOpportunityRequest): Promise<Opportunity> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update opportunity: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error updating opportunity:', error);
      throw error;
    }
  }

  async deleteOpportunity(opportunityId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/opportunities/${opportunityId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete opportunity: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      throw error;
    }
  }

  async moveOpportunity(opportunityId: string, moveData: MoveOpportunityRequest): Promise<Opportunity> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/opportunities/${opportunityId}/move`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(moveData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to move opportunity: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error moving opportunity:', error);
      throw error;
    }
  }

  async getOpportunitiesByStage(pipelineId: string, stageId: string): Promise<Opportunity[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/pipelines/${pipelineId}/stages/${stageId}/opportunities`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch opportunities by stage: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching opportunities by stage:', error);
      throw error;
    }
  }

  async bulkMoveOpportunities(opportunityIds: string[], moveData: MoveOpportunityRequest): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/opportunities/bulk-move`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          opportunityIds,
          pipelineId: moveData.pipelineId,
          stageId: moveData.stageId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to bulk move opportunities: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error bulk moving opportunities:', error);
      throw error;
    }
  }

  async getOpportunitiesByContact(contactId: string): Promise<Opportunity[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/contacts/${contactId}/opportunities`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch contact opportunities: ${response.statusText}`);
      }

      const data = await response.json();
      // Transform ContactOpportunity[] to Opportunity[] format
      const contactOpportunities = data.data || [];
      
      return contactOpportunities.map((contactOpp: any) => ({
        id: contactOpp.opportunityId,
        name: contactOpp.opportunityName,
        source: contactOpp.source,
        value: contactOpp.value,
        pipelineId: contactOpp.pipelineId,
        stageId: contactOpp.stageId,
        description: '',
        contactId: contactId,
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        expectedCloseDate: '',
        priority: contactOpp.priority,
        tags: [],
        dateCreated: contactOpp.dateCreated,
        createdBy: '',
        lastModified: contactOpp.lastModified,
        stageHistory: []
      })) as Opportunity[];
    } catch (error) {
      console.error('Error fetching opportunities by contact:', error);
      throw error;
    }
  }
}

export const opportunityService = new OpportunityService();