const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'admin@alba-service.com' }, select: { id: true, email: true, password: true, status: true } })
  .then((u) => { console.log(JSON.stringify(u, null, 2)); return prisma.disconnect(); })
  .catch((e) => { console.error(e); process.exit(1); });
