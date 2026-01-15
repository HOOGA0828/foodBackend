
import { execSync } from 'child_process';

const SENSITIVE_FILES = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    'mcd_result.json', // Also block temp result files
    'credentials.json',
    'service-account.json'
];

try {
    // Get staged files
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .split('\n')
        .map(file => file.trim())
        .filter(file => file.length > 0);

    const foundSensitiveFiles = stagedFiles.filter(file => {
        return SENSITIVE_FILES.some(sensitive => file.endsWith(sensitive));
    });

    if (foundSensitiveFiles.length > 0) {
        console.error('❌ [Pre-commit Check] 發現敏感檔案正在被提交！');
        console.error('================================================');
        foundSensitiveFiles.forEach(file => {
            console.error(`   - ${file}`);
        });
        console.error('================================================');
        console.error('請將這些檔案移出 Git (使用 git rm --cached <file>)');
        console.error('並確保它們已被加入 .gitignore');
        process.exit(1);
    }

    console.log('✅ [Pre-commit Check] 敏感檔案檢查通過');
    process.exit(0);

} catch (error) {
    // If no git repo or other error, might be safe to warn but allow, or fail.
    // Faint validation: if git fails, we likely can't commit anyway.
    console.warn('⚠️ [Pre-commit Check] 無法執行 git diff 檢查');
    console.error(error);
    process.exit(0); // Allow commit if check fails technically (don't block dev flow on tooling error)
}
