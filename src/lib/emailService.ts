import nodemailer, { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type * as Mail from 'nodemailer/lib/mailer';
import { format } from 'date-fns';

type TransportMode = 'smtp' | 'json';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Mail.Attachment[];
}

interface TransportDiagnostics {
  mode: TransportMode;
  options?: {
    host?: string;
    port?: number;
    secure?: boolean;
    pool?: boolean;
    requireTLS?: boolean;
    maxConnections?: number;
    maxMessages?: number;
  };
  lastVerifiedAt?: string;
  lastVerifyError?: string;
  verified: boolean;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private transportMode: TransportMode = 'smtp';
  private currentOptions: (SMTPTransport.Options & { pool?: boolean; maxConnections?: number; maxMessages?: number } | { jsonTransport: true }) | null = null;
  private isVerified = false;
  private verifyPromise: Promise<void> | null = null;
  private lastVerifiedAt?: Date;
  private lastVerifyError?: string;

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const transporter = this.getTransporter();

    if (!(await this.ensureVerified(transporter))) {
      return false;
    }

    const mailOptions: Mail.Options = {
      from: this.resolveFromAddress(),
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      subject: options.subject,
      html: this.prepareHtml(options.html),
      text: options.text,
      attachments: options.attachments,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      const mode = this.transportMode;
      const payload = Array.isArray(mailOptions.to) ? mailOptions.to.join(', ') : mailOptions.to;
      console.log(`[EmailService] Email dispatched via ${mode} transport`, {
        to: payload,
        subject: mailOptions.subject,
        messageId: result?.messageId,
      });

      if (mode === 'json' && result?.message) {
        console.debug('[EmailService] JSON transport output', result.message);
      }

      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      if (this.shouldResetTransport(error)) {
        this.resetTransporter();
      }
      return false;
    }
  }

  async verifyTransport(): Promise<{ success: boolean; details?: string; mode: TransportMode }> {
    try {
      const transporter = this.getTransporter();

      if (this.transportMode === 'json') {
        this.isVerified = true;
        return {
          success: true,
          mode: this.transportMode,
          details: 'Using JSON transport (emails logged locally). Configure SMTP env vars for live delivery.',
        };
      }

      await transporter.verify();
      this.isVerified = true;
      this.lastVerifiedAt = new Date();
      this.lastVerifyError = undefined;

      return { success: true, mode: this.transportMode };
    } catch (err: any) {
      const message = err?.message || String(err);
      this.lastVerifyError = message;
      this.isVerified = false;
      this.resetTransporter();
      return { success: false, details: message, mode: this.transportMode };
    }
  }

  getDiagnostics(): TransportDiagnostics {
    const diagnostics: TransportDiagnostics = {
      mode: this.transportMode,
      verified: this.isVerified,
      lastVerifiedAt: this.lastVerifiedAt?.toISOString(),
      lastVerifyError: this.lastVerifyError,
    };

    if (this.currentOptions && !('jsonTransport' in this.currentOptions)) {
      const { host, port, secure, pool, requireTLS, maxConnections, maxMessages } = this.currentOptions;
      diagnostics.options = { host, port, secure, pool, requireTLS, maxConnections, maxMessages };
    }

    return diagnostics;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = this.buildTransporter();
      this.isVerified = false;
      this.verifyPromise = null;
    }

    return this.transporter;
  }

  private buildTransporter(): Transporter {
    const host = process.env.EMAIL_HOST;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const port = this.parseNumberEnv(process.env.EMAIL_PORT, 587);

    if (!host || !user || !pass) {
      this.transportMode = 'json';
      this.currentOptions = { jsonTransport: true };
      console.warn('[EmailService] Missing SMTP credentials. Falling back to JSON transport.');
      return nodemailer.createTransport({ jsonTransport: true });
    }

    const secureEnv = process.env.EMAIL_SECURE?.toLowerCase();
    const secure = secureEnv ? secureEnv === 'true' || secureEnv === '1' : port === 465;
    const poolEnv = process.env.EMAIL_POOL?.toLowerCase();
    const pool = poolEnv ? poolEnv === 'true' : true;
    const requireTlsEnv = process.env.EMAIL_REQUIRE_TLS?.toLowerCase();
    const requireTLS = secure ? false : requireTlsEnv ? requireTlsEnv === 'true' : true;

    const options = {
      host,
      port,
      secure,
      auth: { user, pass },
      pool,
      requireTLS,
      maxConnections: pool ? this.parseNumberEnv(process.env.EMAIL_MAX_CONNECTIONS, 5) : undefined,
      maxMessages: pool ? this.parseNumberEnv(process.env.EMAIL_MAX_MESSAGES, 100) : undefined,
      connectionTimeout: this.parseNumberEnv(process.env.EMAIL_CONNECTION_TIMEOUT, 60000),
      socketTimeout: this.parseNumberEnv(process.env.EMAIL_SOCKET_TIMEOUT, 60000),
    } as SMTPTransport.Options & { pool?: boolean; maxConnections?: number; maxMessages?: number };

    if (process.env.EMAIL_TLS_ALLOW_INVALID?.toLowerCase() === 'true') {
      options.tls = { rejectUnauthorized: false };
    }

    this.transportMode = 'smtp';
    this.currentOptions = options;

    return nodemailer.createTransport(options);
  }

  private async ensureVerified(transporter: Transporter): Promise<boolean> {
    if (this.transportMode === 'json') {
      this.isVerified = true;
      return true;
    }

    if (this.isVerified) {
      return true;
    }

    if (!this.verifyPromise) {
      this.verifyPromise = transporter
        .verify()
        .then(() => {
          this.isVerified = true;
          this.lastVerifiedAt = new Date();
          this.lastVerifyError = undefined;
        })
        .catch((error) => {
          this.lastVerifyError = error?.message || String(error);
          this.isVerified = false;
          this.resetTransporter();
          throw error;
        })
        .finally(() => {
          this.verifyPromise = null;
        });
    }

    try {
      await this.verifyPromise;
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP verification failed:', error);
      return false;
    }
  }

  private resolveFromAddress(): string {
    const explicit = process.env.EMAIL_FROM;
    if (explicit) {
      return explicit;
    }

    const address = process.env.EMAIL_USER || 'no-reply@localhost';
    const name = process.env.EMAIL_FROM_NAME || 'Rashmi Group CRM';
    return name ? `"${name}" <${address}>` : address;
  }

  private shouldResetTransport(error: unknown): boolean {
    if (this.transportMode !== 'smtp' || !error || typeof error !== 'object') {
      return false;
    }

    const code = (error as { code?: string }).code;
    if (code && ['ECONNECTION', 'EAUTH', 'ENOTFOUND', 'ESOCKET', 'ETIMEOUT'].includes(code)) {
      return true;
    }

    const responseCode = (error as { responseCode?: number }).responseCode;
    return typeof responseCode === 'number' && responseCode >= 500;
  }

  private resetTransporter() {
    if (this.transporter && typeof (this.transporter as any).close === 'function') {
      try {
        (this.transporter as any).close();
      } catch (error) {
        console.debug('[EmailService] Failed to close transporter cleanly:', error);
      }
    }

    this.transporter = null;
    this.isVerified = false;
    this.verifyPromise = null;
  }

  private parseNumberEnv(value: string | undefined, defaultValue: number): number {
    if (!value) {
      return defaultValue;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  private prepareHtml(content: string): string {
    const trimmed = content.trimStart();
    if (/^<!doctype/i.test(trimmed) || /^<html/i.test(trimmed)) {
      return content;
    }

    return this.wrapWithTemplate(content);
  }

  private wrapWithTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rashmi Group CRM</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f8f9fa;
          }
          .container {
            background-color: #ffffff;
            margin: 20px;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #6b7280;
            font-size: 14px;
          }
          .content {
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          .highlight {
            background-color: #eff6ff;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
            margin: 15px 0;
          }
          .stats {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
          }
          .stat-item {
            text-align: center;
          }
          .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
          }
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Rashmi Group</div>
            <div class="subtitle">Customer Relationship Management System</div>
          </div>

          <div class="content">
            ${content}
          </div>

          <div class="footer">
            <p><strong>Rashmi Group CRM</strong></p>
            <p>This email was sent from Rashmi Group CRM System</p>
            <p>Contact: ithelpdesk@rashmigroup.com</p>
            <p>&copy; ${new Date().getFullYear()} Rashmi Group. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Attendance Email Templates
  generateAttendanceSubmittedEmail(userName: string, date: Date): string {
    return `
      <h2>📝 Attendance Submitted Successfully</h2>
      <div class="highlight">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your attendance for <strong>${format(date, 'EEEE, MMMM do, yyyy')}</strong> has been submitted successfully.</p>
      </div>

      <div class="stats">
        <h3>📊 Submission Details</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${format(date, 'HH:mm')}</div>
            <div class="stat-label">Submitted Time</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">Pending</div>
            <div class="stat-label">Review Status</div>
          </div>
        </div>
      </div>

      <p>You will receive a notification once your attendance is reviewed by the administrator.</p>
      <p>Thank you for maintaining accurate attendance records!</p>
    `;
  }

  generateAttendanceApprovedEmail(userName: string, date: Date, reviewer: string): string {
    return `
      <h2>✅ Attendance Approved</h2>
      <div class="highlight">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Great news! Your attendance for <strong>${format(date, 'EEEE, MMMM do, yyyy')}</strong> has been approved.</p>
      </div>

      <div class="stats">
        <h3>📊 Approval Details</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">Approved</div>
            <div class="stat-label">Status</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${reviewer}</div>
            <div class="stat-label">Approved By</div>
          </div>
        </div>
      </div>

      <p>Keep up the excellent work! Your dedication to timely attendance is appreciated.</p>
    `;
  }

  generateAttendanceRejectedEmail(userName: string, date: Date, reviewer: string, notes?: string): string {
    return `
      <h2>⚠️ Attendance Requires Review</h2>
      <div class="highlight">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your attendance submission for <strong>${format(date, 'EEEE, MMMM do, yyyy')}</strong> requires attention.</p>
      </div>

      <div class="stats">
        <h3>📊 Review Details</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">Rejected</div>
            <div class="stat-label">Status</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${reviewer}</div>
            <div class="stat-label">Reviewed By</div>
          </div>
        </div>
      </div>

      ${notes ? `<p><strong>Review Notes:</strong> ${notes}</p>` : ''}
      <p>Please review the submission and resubmit if necessary.</p>
    `;
  }

  generateAttendanceReminderEmail(userName: string): string {
    return `
      <h2>⏰ Attendance Reminder</h2>
      <div class="highlight">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>This is a friendly reminder to submit your attendance for today.</p>
      </div>

      <div class="stats">
        <h3>📊 Today's Status</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">Pending</div>
            <div class="stat-label">Attendance Status</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${format(new Date(), 'HH:mm')}</div>
            <div class="stat-label">Current Time</div>
          </div>
        </div>
      </div>

      <p>Please submit your attendance to maintain accurate records.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/attendance" class="button">Submit Attendance</a>
    `;
  }

  // Lead Management Emails
  generateLeadAssignedEmail(userName: string, leadName: string, leadCompany: string): string {
    return `
      <h2>🎯 New Lead Assigned</h2>
      <div class="highlight">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>A new lead has been assigned to you for follow-up.</p>
      </div>

      <div class="stats">
        <h3>📊 Lead Details</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${leadName}</div>
            <div class="stat-label">Lead Name</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${leadCompany}</div>
            <div class="stat-label">Company</div>
          </div>
        </div>
      </div>

      <p>Please review the lead details and plan your follow-up strategy.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/leads" class="button">View Leads</a>
    `;
  }

  // Opportunity Emails
  generateOpportunityCreatedEmail(userName: string, oppName: string, companyName: string, dealSize: number): string {
    return `
      <h2>💼 New Opportunity Created</h2>
      <div class="highlight">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>A new sales opportunity has been created and assigned to you.</p>
      </div>

      <div class="stats">
        <h3>📊 Opportunity Details</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${oppName}</div>
            <div class="stat-label">Opportunity Name</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${companyName}</div>
            <div class="stat-label">Company</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">$${dealSize.toLocaleString()}</div>
            <div class="stat-label">Deal Size</div>
          </div>
        </div>
      </div>

      <p>Start building a relationship with this prospect to convert the opportunity.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/opportunities" class="button">View Opportunities</a>
    `;
  }

  // Welcome Email
  generateWelcomeEmail(userName: string): string {
    return `
      <h2>🎉 Welcome to Rashmi Group CRM!</h2>
      <div class="highlight">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Welcome to the Rashmi Group Customer Relationship Management System!</p>
      </div>

      <p>Your account has been successfully created and you're now part of our sales team.</p>

      <h3>🚀 Getting Started:</h3>
      <ul>
        <li>Complete your profile information</li>
        <li>Review assigned leads and opportunities</li>
        <li>Submit daily attendance</li>
        <li>Familiarize yourself with the dashboard</li>
      </ul>

      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" class="button">Access Dashboard</a>

      <p>If you have any questions, please contact the IT helpdesk.</p>
    `;
  }

  // System Notifications
  generateSystemNotificationEmail(userName: string, title: string, message: string): string {
    return `
      <h2>🔔 System Notification</h2>
      <div class="highlight">
        <p>Hello <strong>${userName}</strong>,</p>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>

      <p>This is an automated notification from the Rashmi Group CRM system.</p>
    `;
  }
}

// Export a function to get the email service instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

// For backward compatibility, also export the instance
export const emailService = getEmailService();
