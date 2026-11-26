import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: 'company-1' },
    update: {},
    create: {
      id: 'company-1',
      name: 'ALBA SERVICE GROUP',
      slogan: 'Une seule plateforme pour gérer toute votre entreprise.',
      address: 'Kindu',
      city: 'Kindu',
      province: 'Maniema',
      country: 'République Démocratique du Congo',
      phone: '+243 000 000 000',
      email: 'contact@alba-service.com',
      currency: 'CDF',
      timezone: 'Africa/Lubumbashi',
      primaryColor: '#1E3A8A',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { id: 'role-admin' },
    update: {},
    create: {
      id: 'role-admin',
      name: 'Super Administrateur',
      slug: 'super-admin',
      description: 'Accès complet à tous les modules',
      isSystem: true,
    },
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.upsert({
    where: { id: 'user-1' },
    update: {},
    create: {
      id: 'user-1',
      companyId: company.id,
      email: 'admin@alba-service.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Albert',
      lastName: 'Mulonga',
      status: 'ACTIVE',
      mustChangePwd: false,
    },
  });

  await prisma.userRole.upsert({
    where: { id: 'ur-1' },
    update: {},
    create: {
      id: 'ur-1',
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
