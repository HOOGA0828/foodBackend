import { ScraperResult } from '../types/scraper.js';
export declare class SupabaseService {
    private supabase;
    constructor(supabaseUrl?: string, supabaseKey?: string);
    saveScraperResult(result: ScraperResult): Promise<{
        success: boolean;
        error?: string;
        inserted?: boolean;
    }>;
    private checkExistingRecord;
    getLatestScrapes(brandName?: string, limit?: number): Promise<any[]>;
    cleanupOldRecords(brandName: string, daysAgo?: number): Promise<boolean>;
}
export declare function createSupabaseService(): SupabaseService | null;
//# sourceMappingURL=supabase.d.ts.map