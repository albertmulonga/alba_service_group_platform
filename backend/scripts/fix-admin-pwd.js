const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
(async () => {
  const hash = bcrypt.hashSync('admin123', 10);
  const u = await prisma.user.update({ where: { email: 'admin@alba-service.com' }, data: { password: hash } });
  console.log('UPDATED', u.email, u.password);
  await prisma.disconnect();
})();
