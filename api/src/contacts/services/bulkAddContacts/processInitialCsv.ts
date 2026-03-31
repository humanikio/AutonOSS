import csv from 'csv-parser';
import { Readable } from 'stream';

export interface CSVField {
  name: string;
  sampleValues: string[];
}

export interface ProcessInitialCSVResult {
  fields: CSVField[];
  rowCount: number;
}

export class InitialCSVProcessor {
  async processCSVBuffer(buffer: Buffer): Promise<ProcessInitialCSVResult> {
    return new Promise((resolve, reject) => {
      const results: Record<string, string[]> = {};
      const rows: Record<string, string>[] = [];
      let headers: string[] = [];
      
      const stream = Readable.from(buffer.toString());
      
      stream
        .pipe(csv())
        .on('headers', (headerList: string[]) => {
          headers = headerList;
          // Initialize results object with empty arrays for each header
          headerList.forEach(header => {
            results[header] = [];
          });
        })
        .on('data', (row: Record<string, string>) => {
          // Skip empty or invalid rows
          if (!row || typeof row !== 'object') {
            return;
          }
          
          rows.push(row);
          
          // Collect sample values for each field (up to 3 samples)
          Object.keys(row).forEach(key => {
            // Ensure results[key] exists and is an array
            if (!results[key]) {
              results[key] = [];
            }
            
            if (results[key].length < 3 && row[key] && row[key].trim() !== '') {
              const value = row[key].trim();
              if (!results[key].includes(value)) {
                results[key].push(value);
              }
            }
          });
        })
        .on('end', () => {
          try {
            // Convert results to the expected format
            const fields: CSVField[] = headers.map(header => ({
              name: header,
              sampleValues: results[header] || []
            }));

            console.log(`=� Processed CSV with ${rows.length} rows and ${fields.length} fields`);
            console.log(`= Fields found: ${fields.map(f => f.name).join(', ')}`);

            resolve({
              fields,
              rowCount: rows.length
            });
          } catch (error) {
            console.error('L Error processing CSV end:', error);
            reject(new Error('Failed to process CSV data'));
          }
        })
        .on('error', (error: Error) => {
          console.error('L Error reading CSV:', error);
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        });
    });
  }
}

export const initialCSVProcessor = new InitialCSVProcessor();