import { PrismaClient } from '@prisma/client';

// Global variable to store Prisma Client instance
// Yeh development mein hot-reload ke time reconnection prevent karta hai
const globalForPrisma = globalThis;

// Singleton pattern: Ek hi instance reuse karo
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'], // Database queries console mein dikhenge
});

// Development mein global variable mein store karo
// Production mein nahi (kyunki wahan hot-reload nahi hota)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
