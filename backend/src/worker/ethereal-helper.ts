import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export const createEtherealAccount = async () => {
  logger.info('Generating new Ethereal test account...');
  const testAccount = await nodemailer.createTestAccount();
  logger.info(
    {
      user: testAccount.user,
      pass: '[REDACTED]',
      web: testAccount.web,
    },
    'New Ethereal test credentials generated'
  );

  return {
    user: testAccount.user,
    pass: testAccount.pass,
    web: testAccount.web,
    smtp: testAccount.smtp,
  };
};

if (require.main === module) {
  createEtherealAccount().then((acc) => {
    console.log('\n=============================================');
    console.log('✅ Generated Ethereal Test Account:');
    console.log(`ETHEREAL_USER=${acc.user}`);
    console.log(`ETHEREAL_PASS=${acc.pass}`);
    console.log(`ETHEREAL_HOST=${acc.smtp.host}`);
    console.log(`ETHEREAL_PORT=${acc.smtp.port}`);
    console.log(`Web URL: ${acc.web}`);
    console.log('=============================================\n');
    process.exit(0);
  });
}
