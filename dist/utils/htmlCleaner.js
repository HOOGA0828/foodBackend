const DEFAULT_OPTIONS = {
    keepTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'a', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    removeTags: ['script', 'style', 'svg', 'path', 'meta', 'link', 'nav', 'header', 'footer', 'aside', 'form', 'input', 'button', 'iframe', 'noscript', 'comment'],
    keepImages: true,
    maxLength: 50000
};
export function htmlToMarkdown(html, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    try {
        let cleanedHtml = removeUnwantedTags(html, opts.removeTags);
        if (opts.keepImages) {
            cleanedHtml = preserveImageLinks(cleanedHtml);
        }
        let markdown = convertToMarkdown(cleanedHtml, opts.keepTags);
        markdown = cleanWhitespace(markdown);
        if (opts.maxLength && markdown.length > opts.maxLength) {
            markdown = markdown.substring(0, opts.maxLength) + '\n\n[內容已截斷...]';
        }
        return markdown;
    }
    catch (error) {
        console.error('HTML 清理失敗:', error);
        return extractTextContent(html).substring(0, opts.maxLength || 10000);
    }
}
function removeUnwantedTags(html, removeTags) {
    let result = html;
    for (const tag of removeTags) {
        const tagRegex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
        result = result.replace(tagRegex, '');
        const selfClosingRegex = new RegExp(`<${tag}[^>]*/>`, 'gi');
        result = result.replace(selfClosingRegex, '');
    }
    return result;
}
function preserveImageLinks(html) {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    return html.replace(imgRegex, (match, src) => {
        const altMatch = match.match(/alt=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : '產品圖片';
        return `![${alt}](${src})`;
    });
}
function convertToMarkdown(html, keepTags) {
    let result = html;
    result = result.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, level, content) => {
        const cleanContent = cleanHtmlTags(content);
        return '#'.repeat(parseInt(level)) + ' ' + cleanContent + '\n\n';
    });
    result = result.replace(/<p[^>]*>(.*?)<\/p>/gi, (_, content) => {
        const cleanContent = cleanHtmlTags(content);
        return cleanContent + '\n\n';
    });
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
    result = result.replace(/<table[^>]*>(.*?)<\/table>/gi, (_, content) => {
        return '[表格內容]\n' + cleanHtmlTags(content) + '\n\n';
    });
    result = result.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href, text) => {
        const cleanText = cleanHtmlTags(text);
        return `[${cleanText}](${href})`;
    });
    for (const tag of keepTags) {
        if (!['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'a', 'table'].includes(tag)) {
            const tagRegex = new RegExp(`</?${tag}[^>]*>`, 'gi');
            result = result.replace(tagRegex, '');
        }
    }
    result = cleanHtmlTags(result);
    return result;
}
function cleanHtmlTags(html) {
    return html.replace(/<[^>]+>/g, '').trim();
}
function cleanWhitespace(text) {
    return text
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        .trim();
}
function extractTextContent(html) {
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<[^>]+>/g, ' ');
    return cleanWhitespace(text);
}
export function estimateTokenCount(markdown) {
    const chineseChars = (markdown.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    const otherChars = markdown.length - chineseChars;
    const chineseTokens = chineseChars * 1.5;
    const otherTokens = otherChars / 4;
    return Math.ceil(chineseTokens + otherTokens);
}
//# sourceMappingURL=htmlCleaner.js.map