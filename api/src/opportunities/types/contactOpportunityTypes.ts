export interface ContactOpportunity {
  opportunityId: string;
  opportunityName: string;
  pipelineId: string;
  pipelineName: string;
  stageId: string;
  stageName: string;
  value: number;
  priority: 'low' | 'medium' | 'high';
  source: string;
  status: 'active' | 'won' | 'lost' | 'closed';
  dateCreated: string;
  lastModified: string;
}

export interface ContactOpportunitySummary {
  contactId: string;
  totalOpportunities: number;
  totalValue: number;
  activeOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
  opportunities: ContactOpportunity[];
}