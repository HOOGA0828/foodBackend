/**
 * HTML 清理工具
 * 用於將 HTML 轉換為簡化的 Markdown 格式，去除不必要的標籤以節省 AI Token
 */
/**
 * 預設清理選項
 */
const DEFAULT_OPTIONS = {
    keepTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'a', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    removeTags: ['script', 'style', 'svg', 'path', 'meta', 'link', 'nav', 'header', 'footer', 'aside', 'form', 'input', 'button', 'iframe', 'noscript', 'comment'],
    keepImages: true,
    maxLength: 50000 // 約 50KB 內容限制
};
/**
 * 將 HTML 轉換為簡化的 Markdown 格式
 * @param html 原始 HTML 字串
 * @param options 清理選項
 * @returns 簡化的 Markdown 內容
 */
export function htmlToMarkdown(html, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    try {
        // 基本清理：移除不需要的標籤
        let cleanedHtml = removeUnwantedTags(html, opts.removeTags);
        // 保留圖片連結
        if (opts.keepImages) {
            cleanedHtml = preserveImageLinks(cleanedHtml);
        }
        // 轉換為 Markdown
        let markdown = convertToMarkdown(cleanedHtml, opts.keepTags);
        // 清理多餘的空白和換行
        markdown = cleanWhitespace(markdown);
        // 長度限制
        if (opts.maxLength && markdown.length > opts.maxLength) {
            markdown = markdown.substring(0, opts.maxLength) + '\n\n[內容已截斷...]';
        }
        return markdown;
    }
    catch (error) {
        console.error('HTML 清理失敗:', error);
        // 如果清理失敗，返回基本清理過的文字內容
        return extractTextContent(html).substring(0, opts.maxLength || 10000);
    }
}
/**
 * 移除不需要的標籤
 */
function removeUnwantedTags(html, removeTags) {
    let result = html;
    // 使用正則表達式移除標籤及其內容
    for (const tag of removeTags) {
        // 移除 <tag>...</tag> 的內容
        const tagRegex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
        result = result.replace(tagRegex, '');
        // 移除自閉合標籤 <tag/>
        const selfClosingRegex = new RegExp(`<${tag}[^>]*/>`, 'gi');
        result = result.replace(selfClosingRegex, '');
    }
    return result;
}
/**
 * 保留圖片連結
 */
function preserveImageLinks(html) {
    // 將 <img src="..."> 轉換為 Markdown 圖片語法
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    return html.replace(imgRegex, (match, src) => {
        // 嘗試獲取 alt 文字
        const altMatch = match.match(/alt=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : '產品圖片';
        return `![${alt}](${src})`;
    });
}
/**
 * 將 HTML 轉換為 Markdown
 */
function convertToMarkdown(html, keepTags) {
    let result = html;
    // 轉換標題
    result = result.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, level, content) => {
        const cleanContent = cleanHtmlTags(content);
        return '#'.repeat(parseInt(level)) + ' ' + cleanContent + '\n\n';
    });
    // 轉換段落
    result = result.replace(/<p[^>]*>(.*?)<\/p>/gi, (_, content) => {
        const cleanContent = cleanHtmlTags(content);
        return cleanContent + '\n\n';
    });
    // 轉換列表
    result = result.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (_, content) => {
        const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, item) => {
            const cleanItem = cleanHtmlTags(item);
            return '- ' + cleanItem + '\n';
        });
        return listItems + '\n';
    });
    result = result.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (_, content) => {
        let counter = 1;
        const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, item) => {
            const cleanItem = cleanHtmlTags(item);
            return counter++ + '. ' + cleanItem + '\n';
        });
        return listItems + '\n';
    });
    // 轉換表格 (簡化版本)
    result = result.replace(/<table[^>]*>(.*?)<\/table>/gi, (_, content) => {
        // 這裡可以進一步處理表格，但為了簡化先保留基本結構
        return '[表格內容]\n' + cleanHtmlTags(content) + '\n\n';
    });
    // 轉換連結
    result = result.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href, text) => {
        const cleanText = cleanHtmlTags(text);
        return `[${cleanText}](${href})`;
    });
    // 處理其他保留標籤
    for (const tag of keepTags) {
        if (!['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'a', 'table'].includes(tag)) {
            // 對於其他標籤，保留內容但移除標籤
            const tagRegex = new RegExp(`</?${tag}[^>]*>`, 'gi');
            result = result.replace(tagRegex, ''); // 移除標籤但保留內容
        }
    }
    // 清理剩餘的 HTML 標籤
    result = cleanHtmlTags(result);
    return result;
}
/**
 * 清理 HTML 標籤
 */
function cleanHtmlTags(html) {
    // 移除所有 HTML 標籤
    return html.replace(/<[^>]+>/g, '').trim();
}
/**
 * 清理空白字元和多餘換行
 */
function cleanWhitespace(text) {
    return text
        // 移除多餘的空白
        .replace(/[ \t]+/g, ' ')
        // 移除多餘的空行
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        // 移除行首行尾空白
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        .trim();
}
/**
 * 提取純文字內容 (當 HTML 清理失敗時的備用方案)
 */
function extractTextContent(html) {
    // 移除 script 和 style 標籤內容
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    // 移除所有 HTML 標籤
    text = text.replace(/<[^>]+>/g, ' ');
    // 清理空白
    return cleanWhitespace(text);
}
/**
 * 估算 Markdown 內容的 Token 數量 (粗略估計)
 * GPT-4o-mini 的 Token 計算約為: 1 token ≈ 4 個字元 (英文) 或 1-2 個中文字
 */
export function estimateTokenCount(markdown) {
    // 中文和日文約佔更多 token
    const chineseChars = (markdown.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    const otherChars = markdown.length - chineseChars;
    // 中文日文: 每個字約 1.5-2 tokens
    // 英文數字: 每個字約 0.25 tokens (4字元=1 token)
    const chineseTokens = chineseChars * 1.5;
    const otherTokens = otherChars / 4;
    return Math.ceil(chineseTokens + otherTokens);
}
