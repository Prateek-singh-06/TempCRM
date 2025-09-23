import { prisma } from "@/lib/prisma";

async function testCompanyField() {
  try {
    const test = await prisma.leads.findFirst({
      select: {
        id: true,
        companyId: true,
      }
    });
    console.log("Company field test passed:", test);
  } catch (error) {
    console.error("Company field test failed:", error);
  }
}

testCompanyField();
