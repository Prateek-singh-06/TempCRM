import { NextResponse } from "next/server";

// Dynamic import for web-push to avoid build issues
let webpush: typeof import('web-push') | null = null;
try {
  webpush = require('web-push');
} catch (error) {
  console.warn('web-push not available:', error);
}

// POST /api/notifications/generate-keys - Generate VAPID keys for development
export async function POST() {
  try {
    if (!webpush) {
      return NextResponse.json(
        { error: "Web push not available" },
        { status: 500 }
      );
    }
    const vapidKeys = webpush.generateVAPIDKeys();

    return NextResponse.json({
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
      message: 'VAPID keys generated successfully. Add these to your .env file:'
    });
  } catch (error: unknown) {
    console.error("Error generating VAPID keys:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to generate VAPID keys", details: errorMessage },
      { status: 500 }
    );
  }
}
