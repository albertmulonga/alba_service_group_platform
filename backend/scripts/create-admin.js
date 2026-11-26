const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const users = [
  { id: 'user-1', email: 'admin@alba-service.com',      username: 'admin',      passwordEnv: 'ALBA_SEED_ADMIN_PASSWORD',      firstName: 'Albert', lastName: 'Mulonga',  roleId: 'role-admin' },
  { id: 'user-2', email: 'comptable@alba-service.com',   username: 'comptable',  passwordEnv: 'ALBA_SEED_COMPTABLE_PASSWORD',  firstName: 'Pierre', lastName: 'Mutombo',  roleId: 'role-admin' },
  { id: 'user-3', email: 'imprimerie@alba-service.com',  username: 'imprimerie', passwordEnv: 'ALBA_SEED_IMPRIMERIE_PASSWORD', firstName: 'Jean',   lastName: 'Mukendi',  roleId: 'role-admin' },
];

async function main() {
  console.log('Creating admin user...');
  for (const u of users) {
    if (!process.env[u.passwordEnv]) {
      throw new Error(`Define ${u.passwordEnv} in the environment before running this script.`);
    }
  }

  // Company
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
  console.log('Company:', company.name);

  // Role
  const adminRole = await prisma.role.upsert({
    where: { id: 'role-admin' },
    update: {},
    create: {
      id: 'role-admin',
      name: 'Super Administrateur',
      slug: 'super-admin',
      description: 'Accès complet',
      isSystem: true,
    },
  });
  console.log('Role:', adminRole.name);

  // Users
  for (const u of users) {
    const hash = await bcrypt.hash(process.env[u.passwordEnv], 10);
    const user = await prisma.user.upsert({
      where: { id: u.id },
      update: { password: hash },
      create: {
        id: u.id,
        companyId: company.id,
        email: u.email,
        username: u.username,
        password: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        status: 'ACTIVE',
        mustChangePwd: false,
      },
    });

    await prisma.userRole.upsert({
      where: { id: `ur-${u.id}` },
      update: {},
      create: { id: `ur-${u.id}`, userId: user.id, roleId: u.roleId },
    });

    console.log(`User created: ${user.email}`);
  }

  console.log('\n✅ DONE! User passwords were provided through the environment.');
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
