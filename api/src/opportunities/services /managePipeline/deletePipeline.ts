import { db } from '../../../config/firestore';

export async function deletePipeline(tenantId: string, pipelineId: string): Promise<void> {
  const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
  
  // First, verify the pipeline exists
  const pipelineDoc = await pipelineRef.get();
  if (!pipelineDoc.exists) {
    throw new Error('Pipeline not found');
  }
  
  // Delete all stages within the pipeline
  const stagesRef = pipelineRef.collection('pipelineStages');
  const stagesSnapshot = await stagesRef.get();
  
  const batch = db.batch();
  
  // Delete all stage documents
  stagesSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  // Delete the pipeline document itself
  batch.delete(pipelineRef);
  
  // Execute all deletions
  await batch.commit();
  
  // TODO: In the future, we'll need to handle:
  // 1. Moving/deleting all opportunities within the pipeline stages
  // 2. Updating any references to this pipeline in other documents
  // 3. Possibly archiving instead of hard delete for data recovery
}