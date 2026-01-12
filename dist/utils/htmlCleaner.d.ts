export interface HtmlCleanOptions {
    keepTags?: string[];
    removeTags?: string[];
    keepImages?: boolean;
    maxLength?: number;
}
export declare function htmlToMarkdown(html: string, options?: HtmlCleanOptions): string;
export declare function estimateTokenCount(markdown: string): number;
//# sourceMappingURL=htmlCleaner.d.ts.map