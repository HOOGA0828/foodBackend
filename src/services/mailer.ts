import nodemailer from 'nodemailer';

interface NotificationOptions {
    subject: string;
    text: string;
    html?: string;
}

export const sendNotification = async (options: NotificationOptions): Promise<boolean> => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFICATION_EMAIL } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFICATION_EMAIL) {
        console.warn('⚠️ 缺少郵件設定 (SMTP_*)，略過發送通知');
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"Japan Food Tracker" <${SMTP_USER}>`,
            to: NOTIFICATION_EMAIL,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });

        console.log(`📧 郵件發送成功: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ 郵件發送失敗:', error);
        return false;
    }
};
