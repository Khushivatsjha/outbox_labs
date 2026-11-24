import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { createEtherealAccount } from './ethereal-helper';

let cachedTransporter: nodemailer.Transporter | null = null;

export const getMailTransporter = async (): Promise<nodemailer.Transporter> => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  let user = env.ETHEREAL_USER;
  let pass = env.ETHEREAL_PASS;

  // Auto-generate test account if none provided or placeholder
  if (!user || user.includes('your_ethereal_user') || !pass || pass.includes('your_ethereal_password')) {
    logger.warn('No Ethereal credentials supplied. Creating an automatic ephemeral test account...');
    const account = await createEtherealAccount();
    user = account.user;
    pass = account.pass;
  }

  cachedTransporter = nodemailer.createTransport({
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    secure: env.ETHEREAL_SECURE,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
};

export interface SendMailParams {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | null;
}

export const sendEmailViaEthereal = async (params: SendMailParams): Promise<SendMailResult> => {
  const transporter = await getMailTransporter();

  const formattedHtml = params.body
    .split('\n')
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');

  const info = await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.body,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">${params.subject}</h2>
        ${formattedHtml}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 10px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">Sent via ReachInbox Scheduler test delivery (Ethereal Email).</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;

  logger.info(
    {
      messageId: info.messageId,
      previewUrl,
      recipient: params.to,
    },
    'Email delivered to Ethereal SMTP'
  );

  return {
    messageId: info.messageId,
    previewUrl,
  };
};
