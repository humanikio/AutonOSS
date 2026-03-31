export interface OpportunityData {
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
}

export interface FullOpportunityData {
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
  durationInStage?: number; // in days
}

export interface CreateOpportunityRequest {
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
  stageHistory?: OpportunityStageHistory[];
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
  search?: string; // search in name, description, contact fields
}

export interface OpportunityListResponse {
  opportunities: FullOpportunityData[];
  totalCount: number;
  hasMore: boolean;
}