require('dotenv').config();
const prisma = require('./src/prisma');

async function main() {
  const count = await prisma.property.count();
  console.log('count', count);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});