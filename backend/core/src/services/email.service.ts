import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../config/logger';

/**
 * Service to handle email notifications.
 */
class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  /**
   * Send a general email.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        html,
      });

      logger.info(`Email sent: ${info.messageId}`);
      if (config.env === 'development') {
        logger.info(`Email subject: ${subject}`);
        logger.info(`Email recipient: ${to}`);
      }
    } catch (error) {
      logger.error('Error sending email:', error);
      // In development, we don't want to block the flow if email fails
      if (config.env === 'production') {
        throw new Error('Failed to send email');
      }
    }
  }

  /**
   * Send welcome email to a new user.
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = 'Welcome to Hirion!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Welcome to Hirion, ${name}!</h2>
        <p>We're excited to have you on board. Your account has been successfully created.</p>
        <p>You can now log in to your dashboard and start exploring available opportunities.</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
          <p style="margin: 0;"><strong>Next Steps:</strong></p>
          <ul style="margin-top: 10px;">
            <li>Complete your profile</li>
            <li>Upload your latest resume</li>
            <li>Apply for jobs or browse talent</li>
          </ul>
        </div>
        <p style="margin-top: 20px;">If you have any questions, feel free to reply to this email.</p>
        <p>Best regards,<br/>The Hirion Team</p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send password reset email.
   */
  async sendPasswordResetEmail(to: string, token: string, name?: string): Promise<void> {
    const resetLink = `${config.baseUrl}/reset-password?token=${token}`;
    const subject = 'Password Reset Request - Hirion';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Password Reset Request</h2>
        <p>Hello${name ? ' ' + name : ''},</p>
        <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
        <p>To reset your password, click the button below. This link will expire in 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4f46e5;">${resetLink}</p>
        <p style="margin-top: 20px;">Best regards,<br/>The Hirion Team</p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send verification OTP email.
   */
  async sendVerificationOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Verify your email - Hirion';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Verify your email</h2>
        <p>Hello,</p>
        <p>Thank you for signing up for Hirion. To complete your registration, please use the following One-Time Password (OTP):</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; padding: 12px 24px; background-color: #f8fafc; color: #4f46e5; font-size: 24px; font-weight: 700; border-radius: 6px; border: 1px dashed #4f46e5; letter-spacing: 4px;">${otp}</span>
        </div>
        <p>This OTP will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        <p style="margin-top: 20px;">Best regards,<br/>The Hirion Team</p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send password change confirmation email.
   */
  async sendPasswordChangedEmail(to: string, name?: string): Promise<void> {
    const subject = 'Security Alert: Password Changed - Hirion';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Your password has been changed</h2>
        <p>Hello${name ? ' ' + name : ''},</p>
        <p>This is a confirmation that the password for your Hirion account was recently changed.</p>
        <p>If you made this change, you can safely ignore this email.</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fee2e2;">
          <p style="margin: 0; color: #991b1b;"><strong>Didn't make this change?</strong></p>
          <p style="margin-top: 5px; color: #b91c1c;">Please contact our support team immediately or reset your password to secure your account.</p>
        </div>
        <p style="margin-top: 20px;">Best regards,<br/>The Hirion Team</p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send account deletion confirmation email.
   */
  async sendAccountDeletedEmail(to: string, name?: string): Promise<void> {
    const subject = 'Account Deleted - Hirion';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ef4444;">Your account has been deleted</h2>
        <p>Hello${name ? ' ' + name : ''},</p>
        <p>We're writing to confirm that your Hirion account and all associated data have been permanently deleted as requested.</p>
        <p>We're sorry to see you go. If you ever change your mind, you're always welcome to sign up again.</p>
        <p style="margin-top: 20px;">Best regards,<br/>The Hirion Team</p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }
}

export const emailService = new EmailService();
export default emailService;
