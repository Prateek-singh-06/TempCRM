import { emailService } from "@/lib/emailService";

export async function sendEmail(to: string, subject: string, html: string) {
  // Delegate to centralized email service with HTML template
  return emailService.sendEmail({ to, subject, html });
}
