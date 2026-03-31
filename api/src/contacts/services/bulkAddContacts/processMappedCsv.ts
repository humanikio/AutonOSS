import csv from 'csv-parser';
import { Readable } from 'stream';
import { contactCreationService, CreateContactRequest } from '../createContacts';

export interface FieldMapping {
  csvField: string;
  contactField: string;
}

export interface ProcessMappedCSVResult {
  success: number;
  failed: number;
  errors: string[];
  createdContactIds: string[];
}

export class MappedCSVProcessor {
  async processMappedCSV(
    buffer: Buffer, 
    fieldMappings: FieldMapping[], 
    tenantId: string
  ): Promise<ProcessMappedCSVResult> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];
      const results: ProcessMappedCSVResult = {
        success: 0,
        failed: 0,
        errors: [],
        createdContactIds: []
      };

      // Create a mapping lookup for faster access
      const mappingLookup = new Map<string, string>();
      fieldMappings.forEach(mapping => {
        if (mapping.contactField) {
          mappingLookup.set(mapping.csvField, mapping.contactField);
        }
      });

      console.log(`=�  Processing CSV with field mappings:`, Object.fromEntries(mappingLookup));

      const stream = Readable.from(buffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (row: Record<string, string>) => {
          // Skip empty or invalid rows
          if (!row || typeof row !== 'object') {
            return;
          }
          rows.push(row);
        })
        .on('end', async () => {
          console.log(`=� Processing ${rows.length} rows for bulk contact creation`);
          
          // Process each row
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 1;
            
            try {
              // Map CSV fields to contact fields
              const mappedData: Partial<CreateContactRequest> = {
                tenantId
              };

              let hasPhoneNumber = false;

              // Apply field mappings
              Object.keys(row).forEach(csvField => {
                const contactField = mappingLookup.get(csvField);
                if (contactField && row[csvField] && row[csvField].trim()) {
                  const value = row[csvField].trim();
                  
                  switch (contactField) {
                    case 'name':
                    case 'firstName':
                    case 'lastName':
                    case 'email':
                    case 'dateOfBirth':
                      (mappedData as any)[contactField] = value;
                      break;
                    case 'phone':
                      mappedData.phoneNumber = value;
                      hasPhoneNumber = true;
                      break;
                  }
                }
              });

              // Validate required fields
              if (!hasPhoneNumber) {
                results.failed++;
                results.errors.push(`Row ${rowNumber}: Phone number is required`);
                continue;
              }

              // Create full name from firstName and lastName if available and name not already set
              if (!(mappedData as any).name) {
                const firstName = (mappedData as any).firstName || '';
                const lastName = (mappedData as any).lastName || '';
                if (firstName || lastName) {
                  mappedData.name = `${firstName} ${lastName}`.trim();
                }
              }

              // Create the contact
              const createRequest: CreateContactRequest = {
                tenantId,
                channel: 'SMS',
                address: mappedData.phoneNumber!,
                phoneNumber: mappedData.phoneNumber!,
                name: mappedData.name,
                email: (mappedData as any).email,
                notes: `Imported via CSV upload on ${new Date().toISOString()}`
              };

              const contactId = await contactCreationService.createContact(createRequest);
              results.success++;
              results.createdContactIds.push(contactId);
              
              console.log(` Created contact ${contactId} from row ${rowNumber}`);

            } catch (error) {
              results.failed++;
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              results.errors.push(`Row ${rowNumber}: ${errorMessage}`);
              console.error(`L Failed to create contact from row ${rowNumber}:`, error);
            }
          }

          console.log(`<� Bulk upload complete: ${results.success} success, ${results.failed} failed`);
          resolve(results);
        })
        .on('error', (error: Error) => {
          console.error('L Error reading CSV for mapping:', error);
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        });
    });
  }
}

export const mappedCSVProcessor = new MappedCSVProcessor();