const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDailyPixels() {
  console.log('Resetting daily pixels for all users...');
  await prisma.user.updateMany({
    data: {
      dailyPixelsUsed: 0,
      lastPixelReset: new Date(),
    },
  });

  console.log('Reset complete. Placements preserved.');
  await prisma.$disconnect();
}

resetDailyPixels().catch(console.error);