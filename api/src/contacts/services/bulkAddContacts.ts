import { initialCSVProcessor, ProcessInitialCSVResult } from './bulkAddContacts/processInitialCsv';
import { mappedCSVProcessor, FieldMapping, ProcessMappedCSVResult } from './bulkAddContacts/processMappedCsv';

export { FieldMapping, ProcessMappedCSVResult };

export class BulkAddContactsService {
  async processInitialCSV(buffer: Buffer): Promise<ProcessInitialCSVResult> {
    console.log('=Ë Starting initial CSV processing...');
    
    try {
      const result = await initialCSVProcessor.processCSVBuffer(buffer);
      console.log(` Initial CSV processing complete: ${result.fields.length} fields, ${result.rowCount} rows`);
      return result;
    } catch (error) {
      console.error('L Initial CSV processing failed:', error);
      throw error;
    }
  }

  async processMappedCSV(
    buffer: Buffer, 
    fieldMappings: FieldMapping[], 
    tenantId: string
  ): Promise<ProcessMappedCSVResult> {
    console.log('=ú  Starting mapped CSV processing...');
    
    try {
      const result = await mappedCSVProcessor.processMappedCSV(buffer, fieldMappings, tenantId);
      console.log(` Mapped CSV processing complete: ${result.success} created, ${result.failed} failed`);
      return result;
    } catch (error) {
      console.error('L Mapped CSV processing failed:', error);
      throw error;
    }
  }
}

export const bulkAddContactsService = new BulkAddContactsService();