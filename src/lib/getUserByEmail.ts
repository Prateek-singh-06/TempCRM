import { prisma } from "@/lib/prisma";

export async function getUserByEmail(email: string) {
  const user = await prisma.users.findUnique({
    where: { email },
    select: {
        name: true,
        email: true,
        role: true,
        employeeCode: true,
        verified: true
    }
  });
  return user;
}
