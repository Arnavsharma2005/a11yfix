import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __a11yfixPrisma: PrismaClient | undefined;
}

export const prisma = global.__a11yfixPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__a11yfixPrisma = prisma;
}
