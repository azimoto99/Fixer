import Papa from 'papaparse';
import { BulkJobData } from './enterpriseApi';
import { bulkJobSchema } from '@fixer/shared';

export interface CSVValidationResult {
  valid: boolean;
  data?: BulkJobData[];
  errors: string[];
}

export const csvHelpers = {
  validateCSV(file: File): Promise<CSVValidationResult> {
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data: BulkJobData[] = [];
          const errors: string[] = [];

          results.data.forEach((row, index) => {
            try {
              // Transform row fields to BulkJobData shape
              const job: any = {
                title: row['title'],
                description: row['description'],
                location: {
                  address: row['location.address'],
                  latitude: Number(row['location.latitude']),
                  longitude: Number(row['location.longitude']),
                  city: row['location.city'],
                  state: row['location.state'],
                  zipCode: row['location.zipCode'],
                },
                category: row['category'] as any,
                payRate: {
                  type: row['payRate.type'] as any,
                  amount: Number(row['payRate.amount']),
                  currency: row['payRate.currency'] as any,
                },
                schedule: {
                  startDate: row['schedule.startDate'],
                  endDate: row['schedule.endDate'] || undefined,
                  recurring: row['schedule.recurring'] === 'true',
                  frequency: row['schedule.frequency'] as any,
                  daysOfWeek: row['schedule.daysOfWeek']
                    ? row['schedule.daysOfWeek'].split(',').map((d) => Number(d.trim()))
                    : undefined,
                },
                requirements: row['requirements']
                  ? row['requirements'].split(',').map((r) => r.trim())
                  : [],
                urgency: row['urgency'] as any,
                workerCount: Number(row['workerCount']),
                estimatedDuration: Number(row['estimatedDuration']),
                clientNotes: row['clientNotes'] || undefined,
                backgroundCheckRequired: row['backgroundCheckRequired'] === 'true',
                equipmentProvided: row['equipmentProvided'] === 'true',
                parkingAvailable: row['parkingAvailable'] === 'true',
              };

              // Validate shape
              const parsed = bulkJobSchema.parse({ jobs: [job] });
              data.push(parsed.jobs[0]);
            } catch (err: any) {
              errors.push(`Row ${index + 2}: ${err.message}`);
            }
          });

          resolve({ valid: errors.length === 0, data: errors.length === 0 ? data : undefined, errors });
        },
        error: (error) => {
          resolve({ valid: false, errors: [error.message] });
        }
      });
    });
  },

  downloadTemplate() {
    const headers = [
      'title',
      'description',
      'location.address',
      'location.latitude',
      'location.longitude',
      'location.city',
      'location.state',
      'location.zipCode',
      'category',
      'payRate.type',
      'payRate.amount',
      'payRate.currency',
      'schedule.startDate',
      'schedule.endDate',
      'schedule.recurring',
      'schedule.frequency',
      'schedule.daysOfWeek',
      'requirements',
      'urgency',
      'workerCount',
      'estimatedDuration',
      'clientNotes',
      'backgroundCheckRequired',
      'equipmentProvided',
      'parkingAvailable'
    ];

    const csv = Papa.unparse({ fields: headers, data: [] });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bulk_jobs_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
