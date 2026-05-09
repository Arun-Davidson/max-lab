import emailService from '../src/services/email.service';

async function verifyEmail() {
    console.log('Testing Email Service...');
    const EMAIL_ADDRESS= 'bharathkumar100q@gmail.com'

    try {
        await emailService.sendWelcomeEmail(`${EMAIL_ADDRESS}`, 'Test User');
        console.log('Welcome email triggered.');

        await emailService.sendPasswordResetEmail(`${EMAIL_ADDRESS}`, 'mock-token-123', 'Test User');
        console.log('Password reset email triggered.');

        console.log('Check logs/console for email output (in development mode).');
    } catch (error) {
        console.error('Email verification failed:', error);
    }
}

verifyEmail();
