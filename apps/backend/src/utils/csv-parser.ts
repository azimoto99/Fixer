import { z } from 'zod';

/**
 * CSV Parser utility for bulk job imports
 */

export interface CSVParseResult<T> {
  data: T[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: any;
  }>;
  totalRows: number;
  successfulRows: number;
}

/**
 * Parse CSV content into typed data
 */
export async function parseCSV<T>(
  file: File,
  schema: z.ZodSchema<T>,
  options?: {
    skipHeader?: boolean;
    delimiter?: string;
  }
): Promise<CSVParseResult<T>> {
  const { skipHeader = true, delimiter = ',' } = options || {};
  
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return {
      data: [],
      errors: [{ row: 0, message: 'CSV file is empty' }],
      totalRows: 0,
      successfulRows: 0
    };
  }

  const startRow = skipHeader ? 1 : 0;
  const dataRows = lines.slice(startRow);
  const headers = skipHeader ? parseCSVLine(lines[0], delimiter) : null;
  
  const results: T[] = [];
  const errors: CSVParseResult<T>['errors'] = [];
  
  for (let i = 0; i < dataRows.length; i++) {
    const rowIndex = i + startRow + 1; // 1-based row numbers
    const line = dataRows[i];
    
    try {
      const values = parseCSVLine(line, delimiter);
      
      // Convert to object if headers are provided
      let rowData: any;
      if (headers) {
        rowData = {};
        headers.forEach((header, index) => {
          rowData[header.trim()] = values[index]?.trim() || '';
        });
      } else {
        rowData = values;
      }
      
      // Validate with schema
      const parsed = schema.parse(rowData);
      results.push(parsed);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach(issue => {
          errors.push({
            row: rowIndex,
            field: issue.path.join('.'),
            message: issue.message,
            data: 'received' in issue ? issue.received : undefined
          });
        });
      } else {
        errors.push({
          row: rowIndex,
          message: error instanceof Error ? error.message : 'Unknown parsing error'
        });
      }
    }
  }
  
  return {
    data: results,
    errors,
    totalRows: dataRows.length,
    successfulRows: results.length
  };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
      i++;
    } else {
      // Regular character
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

/**
 * Convert array of objects to CSV string
 */
export function generateCSV<T extends Record<string, any>>(
  data: T[],
  options?: {
    headers?: string[];
    delimiter?: string;
    includeHeaders?: boolean;
  }
): string {
  const { delimiter = ',', includeHeaders = true } = options || {};
  
  if (data.length === 0) {
    return '';
  }
  
  const headers = options?.headers || Object.keys(data[0]);
  const lines: string[] = [];
  
  // Add headers if requested
  if (includeHeaders) {
    lines.push(headers.map(header => escapeCSVField(header)).join(delimiter));
  }
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return escapeCSVField(String(value ?? ''));
    });
    lines.push(values.join(delimiter));
  }
  
  return lines.join('\n');
}

/**
 * Escape a CSV field value
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Sample CSV job schema for validation
 */
export const csvJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  latitude: z.string().transform(val => parseFloat(val)).pipe(z.number()),
  longitude: z.string().transform(val => parseFloat(val)).pipe(z.number()),
  payAmount: z.string().transform(val => parseFloat(val)).pipe(z.number().positive()),
  payType: z.enum(['fixed', 'hourly']),
  estimatedDuration: z.string().transform(val => parseInt(val)).pipe(z.number().positive()),
  requirements: z.string().optional().transform(val => val ? val.split(';').map(r => r.trim()) : []),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  workerCount: z.string().transform(val => parseInt(val) || 1).pipe(z.number().min(1).max(50)),
  backgroundCheckRequired: z.string().optional().transform(val => val?.toLowerCase() === 'true' || val === '1').pipe(z.boolean()),
  equipmentProvided: z.string().optional().transform(val => val?.toLowerCase() === 'true' || val === '1').pipe(z.boolean()),
  scheduledStart: z.string().min(1, 'Scheduled start date is required'),
  clientNotes: z.string().optional()
}).transform(data => ({
  title: data.title,
  description: data.description,
  location: {
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city,
    state: data.state,
    zipCode: data.zipCode
  },
  category: data.category as 'cleaning' | 'maintenance' | 'security' | 'landscaping' | 'moving',
  payRate: {
    type: data.payType,
    amount: data.payAmount,
    currency: 'USD' as const
  },
  schedule: {
    startDate: new Date(data.scheduledStart).toISOString(),
    recurring: false
  },
  requirements: data.requirements || [],
  urgency: data.urgency,
  workerCount: data.workerCount,
  estimatedDuration: data.estimatedDuration,
  clientNotes: data.clientNotes,
  backgroundCheckRequired: data.backgroundCheckRequired || false,
  equipmentProvided: data.equipmentProvided || false,
  parkingAvailable: false
}));

/**
 * Sample CSV template for job imports
 */
export const csvJobTemplate = [
  'title,description,category,address,city,state,zipCode,latitude,longitude,payAmount,payType,estimatedDuration,requirements,urgency,workerCount,backgroundCheckRequired,equipmentProvided,scheduledStart,clientNotes',
  'Office Cleaning,Daily office cleaning and maintenance,cleaning,"123 Main St, Suite 100",Springfield,IL,62701,39.7817,-89.6501,25.00,hourly,2,"vacuuming;dusting;trash removal",medium,1,false,true,2024-01-15T09:00:00Z,Please use eco-friendly products',
  'Lawn Maintenance,Weekly lawn mowing and edging,landscaping,"456 Oak Ave",Springfield,IL,62704,39.7990,-89.6540,150.00,fixed,3,"mowing;edging;leaf removal",low,2,false,true,2024-01-16T08:00:00Z,Equipment storage available in garage'
].join('\n');
