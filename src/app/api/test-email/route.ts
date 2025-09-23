import { NextResponse } from "next/server";
import { emailService } from "@/lib/emailService";

// Test email functionality routed through the shared email service
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, text } = body ?? {};

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, text" },
        { status: 400 }
      );
    }

    const verification = await emailService.verifyTransport();
    if (!verification.success) {
      return NextResponse.json(
        { error: "SMTP verification failed", details: verification.details, mode: verification.mode },
        { status: 502 }
      );
    }

    const testEmailTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <style>
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  background-color: #f4f4f4;
              }
              .header {
                  background-color: #2563eb;
                  color: white;
                  padding: 20px;
                  text-align: center;
                  border-radius: 5px 5px 0 0;
              }
              .content {
                  background-color: white;
                  padding: 20px;
                  border-radius: 0 0 5px 5px;
              }
              .footer {
                  font-size: 12px;
                  color: #666;
                  text-align: center;
                  margin-top: 20px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h2>CRM Email Test</h2>
              </div>
              <div class="content">
                  <h3>Test Email Sent Successfully!</h3>
                  <p>${text}</p>
                  <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              </div>
              <div class="footer">
                  <p>This is a test email from CRM Pro system.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const sent = await emailService.sendEmail({
      to,
      subject,
      html: testEmailTemplate,
      text,
    });

    if (!sent) {
      return NextResponse.json({ error: "Failed to dispatch email", mode: verification.mode }, { status: 500 });
    }

    return NextResponse.json({
      message: "Test email sent successfully",
      timestamp: new Date().toISOString(),
      mode: verification.mode,
      diagnostics: emailService.getDiagnostics(),
    });
  } catch (error: unknown) {
    console.error("Error sending test email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to verify email configuration
export async function GET() {
  try {
    const diagnostics = emailService.getDiagnostics();
    const env = {
      EMAIL_HOST: !!process.env.EMAIL_HOST,
      EMAIL_PORT: !!process.env.EMAIL_PORT,
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS ? "set" : "missing",
    };

    return NextResponse.json({
      message: "Email configuration status",
      env,
      diagnostics,
      isConfigured: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
    });
  } catch (error: unknown) {
    console.error("Email configuration check failed:", error);
    return NextResponse.json(
      { error: "Failed to check email configuration" },
      { status: 500 }
    );
  }
}
