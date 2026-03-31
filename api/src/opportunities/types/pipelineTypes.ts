export interface PipelineData {
  name: string;
  visibleInFunnelChart?: boolean;
  visibleInPieChart?: boolean;
}

export interface FullPipelineData {
  id: string;
  name: string;
  dateCreated: string;
  createdBy: string;
  lastModified: string;
  visibleInFunnelChart: boolean;
  visibleInPieChart: boolean;
  opportunityCount: number;
  totalValue: number;
}

export interface StageData {
  name: string;
  order?: number;
}

export interface FullStageData {
  id: string;
  name: string;
  order: number;
  dateCreated: string;
  lastModified: string;
  opportunityCount: number;
  totalValue: number;
  color?: string;
}

export interface CreateStageRequest {
  name: string;
  order?: number;
}

export interface UpdateStageRequest {
  name?: string;
  order?: number;
}