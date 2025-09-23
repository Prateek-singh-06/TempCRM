import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length,
    DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}
