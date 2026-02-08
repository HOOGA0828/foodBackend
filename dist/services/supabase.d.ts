import { ScraperResult } from '../types/scraper.js';
export declare class SupabaseService {
    private prisma;
    constructor();
    saveScraperResult(result: ScraperResult): Promise<{
        success: boolean;
        error?: string;
        inserted?: boolean;
    }>;
    private parseDateString;
    private recordCrawlerRun;
    clearBrandProducts(brandName: string): Promise<{
        success: boolean;
        deletedCount: number;
        error?: string;
    }>;
}
export declare function createSupabaseService(): SupabaseService;
//# sourceMappingURL=supabase.d.ts.map