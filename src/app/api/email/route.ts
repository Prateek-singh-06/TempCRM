import { NextResponse } from "next/server";
import { emailService } from "@/lib/emailService";

export async function POST(req: Request) {
  try {
    const { to, subject, message } = await req.json();

    await emailService.sendEmail({
      to,
      subject,
      html: message
    });

    return NextResponse.json({ success: true});
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
