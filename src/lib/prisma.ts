// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Test database connection on startup
if (process.env.NODE_ENV === 'development') {
  prisma.$connect()
    .then(() => console.log('✅ Database connected successfully'))
    .catch((error) => console.error('❌ Database connection failed:', error));
}
