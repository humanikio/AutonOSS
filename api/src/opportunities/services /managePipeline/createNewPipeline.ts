import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../config/firestore';
import { FullPipelineData } from '../../types/pipelineTypes';

export async function createNewPipeline(tenantId: string, name: string): Promise<FullPipelineData> {
  const pipelineId = uuidv4();
  const now = new Date().toISOString();
  
  const pipelineData: FullPipelineData = {
    id: pipelineId,
    name: name,
    dateCreated: now,
    createdBy: tenantId,
    lastModified: now,
    visibleInFunnelChart: true,
    visibleInPieChart: true,
    opportunityCount: 0,
    totalValue: 0
  };
  
  // Create pipeline document in Firestore
  const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
  await pipelineRef.set(pipelineData);
  
  return pipelineData;
}