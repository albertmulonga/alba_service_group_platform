const { PrismaClient } = require('./node_modules/@prisma/client');
const bcrypt = require('bcrypt');

const p = new PrismaClient();

async function main() {
  const h = await bcrypt.hash('admin123', 12);
  const company = await p.company.findFirst();

  if (!company) {
    console.log('ERROR: No company found');
    process.exit(1);
  }

  const existing = await p.user.findUnique({ where: { email: 'admin@alba-service.com' } });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const user = await p.user.create({
    data: {
      email: 'admin@alba-service.com',
      username: 'admin_' + Date.now().toString(36),
      password: h,
      firstName: 'Admin',
      lastName: 'ALBA',
      companyId: company.id,
      status: 'ACTIVE',
      mustChangePwd: false,
    },
  });

  const role = await p.role.findFirst({ where: { name: 'Super Administrateur' } });
  if (role) {
    await p.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }

  console.log('Admin user created: admin@alba-service.com / admin123');
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => p.disconnect());
