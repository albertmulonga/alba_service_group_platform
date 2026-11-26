const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🚀 ALBA SERVICE GROUP — Création des comptes utilisateurs\n');
  for (const envName of [
    'ALBA_SEED_ADMIN_PASSWORD',
    'ALBA_SEED_COMPTABLE_PASSWORD',
    'ALBA_SEED_IMPRIMERIE_PASSWORD',
    'ALBA_SEED_GRAPHISTE_PASSWORD',
    'ALBA_SEED_SECRETAIRE_PASSWORD',
    'ALBA_SEED_DEVELOPPEUR_PASSWORD',
    'ALBA_SEED_FORMATEUR_PASSWORD',
    'ALBA_SEED_TECHNICIEN_PASSWORD',
    'ALBA_SEED_CAISSIER_PASSWORD',
  ]) {
    if (!process.env[envName]) {
      throw new Error(`Define ${envName} in the environment before running this script.`);
    }
  }

  // ── Company ──────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where:  { id: 'company-alba-1' },
    update: {},
    create: {
      id: 'company-alba-1',
      name: 'ALBA SERVICE GROUP',
      slogan: 'Une seule plateforme pour gérer toute votre entreprise.',
      address: 'Avenue Lumumba',
      city: 'Kindu',
      province: 'Maniema',
      country: 'République Démocratique du Congo',
      phone: '+243 000 000 000',
      email: 'contact@alba-service.com',
      website: 'www.alba-service.com',
      currency: 'CDF',
      timezone: 'Africa/Lubumbashi',
      primaryColor: '#1E3A8A',
    },
  });
  console.log(`✅ Entreprise: ${company.name}`);

  // ── Roles ─────────────────────────────────────────────────
  const ROLES = [
    { id: 'role-super-admin',   name: 'Super Administrateur', slug: 'super-admin',           isSystem: true  },
    { id: 'role-admin',         name: 'Administrateur',       slug: 'admin',                  isSystem: false },
    { id: 'role-comptable',     name: 'Comptable',            slug: 'comptable',              isSystem: false },
    { id: 'role-imprimerie',    name: 'Resp. Imprimerie',     slug: 'responsable-imprimerie', isSystem: false },
    { id: 'role-graphiste',     name: 'Graphiste',            slug: 'graphiste',              isSystem: false },
    { id: 'role-secretaire',    name: 'Secrétaire',           slug: 'secretaire',             isSystem: false },
    { id: 'role-developpeur',   name: 'Développeur',          slug: 'developpeur',            isSystem: false },
    { id: 'role-formateur',     name: 'Formateur',            slug: 'formateur',              isSystem: false },
    { id: 'role-technicien',    name: 'Technicien IT',        slug: 'technicien',             isSystem: false },
    { id: 'role-magasinier',    name: 'Magasinier',           slug: 'magasinier',             isSystem: false },
    { id: 'role-caissier',      name: 'Caissier',             slug: 'caissier',               isSystem: false },
    { id: 'role-employee',      name: 'Employé',              slug: 'employee',               isSystem: false },
  ];

  for (const r of ROLES) {
    try {
      await prisma.role.upsert({
        where: { slug: r.slug },
        update: { name: r.name },
        create: { id: r.id, name: r.name, slug: r.slug, description: r.name, isSystem: r.isSystem },
      });
    } catch (e) {
      // If id conflict, just update by slug
      await prisma.role.updateMany({ where: { slug: r.slug }, data: { name: r.name } });
    }
  }
  console.log(`✅ ${ROLES.length} rôles créés/mis à jour`);

  // ── Users ─────────────────────────────────────────────────
  const USERS = [
    {
      id: 'user-admin-1',
      email: 'admin@alba-service.com',
      username: 'admin',
      passwordEnv: 'ALBA_SEED_ADMIN_PASSWORD',
      firstName: 'Albert',
      lastName: 'Mulonga',
      position: 'Super Administrateur & Fondateur',
      roleId: 'role-super-admin',
      urId: 'ur-admin-1',
    },
    {
      id: 'user-comptable-1',
      email: 'comptable@alba-service.com',
      username: 'comptable',
      passwordEnv: 'ALBA_SEED_COMPTABLE_PASSWORD',
      firstName: 'Pierre',
      lastName: 'Mutombo',
      position: 'Comptable Principal',
      roleId: 'role-comptable',
      urId: 'ur-comptable-1',
    },
    {
      id: 'user-imprimerie-1',
      email: 'imprimerie@alba-service.com',
      username: 'imprimerie',
      passwordEnv: 'ALBA_SEED_IMPRIMERIE_PASSWORD',
      firstName: 'Jean',
      lastName: 'Mukendi',
      position: 'Responsable Imprimerie',
      roleId: 'role-imprimerie',
      urId: 'ur-imprimerie-1',
    },
    {
      id: 'user-graphiste-1',
      email: 'graphiste@alba-service.com',
      username: 'graphiste',
      passwordEnv: 'ALBA_SEED_GRAPHISTE_PASSWORD',
      firstName: 'Marie',
      lastName: 'Kabange',
      position: 'Graphiste Senior',
      roleId: 'role-graphiste',
      urId: 'ur-graphiste-1',
    },
    {
      id: 'user-secretaire-1',
      email: 'secretaire@alba-service.com',
      username: 'secretaire',
      passwordEnv: 'ALBA_SEED_SECRETAIRE_PASSWORD',
      firstName: 'Sophie',
      lastName: 'Banza',
      position: 'Secrétaire Principale',
      roleId: 'role-secretaire',
      urId: 'ur-secretaire-1',
    },
    {
      id: 'user-dev-1',
      email: 'developpeur@alba-service.com',
      username: 'developpeur',
      passwordEnv: 'ALBA_SEED_DEVELOPPEUR_PASSWORD',
      firstName: 'Paul',
      lastName: 'Ilunga',
      position: 'Développeur Full Stack',
      roleId: 'role-developpeur',
      urId: 'ur-dev-1',
    },
    {
      id: 'user-formateur-1',
      email: 'formateur@alba-service.com',
      username: 'formateur',
      passwordEnv: 'ALBA_SEED_FORMATEUR_PASSWORD',
      firstName: 'Grace',
      lastName: 'Tshiamba',
      position: 'Formateur IT',
      roleId: 'role-formateur',
      urId: 'ur-formateur-1',
    },
    {
      id: 'user-tech-1',
      email: 'technicien@alba-service.com',
      username: 'technicien',
      passwordEnv: 'ALBA_SEED_TECHNICIEN_PASSWORD',
      firstName: 'David',
      lastName: 'Kasongo',
      position: 'Technicien Informatique',
      roleId: 'role-technicien',
      urId: 'ur-tech-1',
    },
    {
      id: 'user-caissier-1',
      email: 'caissier@alba-service.com',
      username: 'caissier',
      passwordEnv: 'ALBA_SEED_CAISSIER_PASSWORD',
      firstName: 'Alice',
      lastName: 'Mwamba',
      position: 'Caissière',
      roleId: 'role-caissier',
      urId: 'ur-caissier-1',
    },
  ];

  console.log('\n📋 Création des comptes:\n');
  for (const u of USERS) {
    const hashed = await bcrypt.hash(process.env[u.passwordEnv], 10);

    const user = await prisma.user.upsert({
      where:  { id: u.id },
      update: {
        password: hashed,
        status: 'ACTIVE',
        mustChangePwd: false,
        firstName: u.firstName,
        lastName: u.lastName,
        position: u.position,
        email: u.email,
      },
      create: {
        id: u.id,
        companyId: company.id,
        email: u.email,
        username: u.username,
        password: hashed,
        firstName: u.firstName,
        lastName: u.lastName,
        position: u.position,
        status: 'ACTIVE',
        mustChangePwd: false,
      },
    });

    // Find actual role ID by ID or slug fallback
    let actualRole = await prisma.role.findUnique({ where: { id: u.roleId } });
    if (!actualRole) {
      // Find by slug mapping
      const slugMap = {
        'role-super-admin': 'super-admin', 'role-comptable': 'comptable',
        'role-imprimerie': 'responsable-imprimerie', 'role-graphiste': 'graphiste',
        'role-secretaire': 'secretaire', 'role-developpeur': 'developpeur',
        'role-formateur': 'formateur', 'role-technicien': 'technicien',
        'role-caissier': 'caissier', 'role-employee': 'employee',
        'role-admin': 'admin',
      };
      const slug = slugMap[u.roleId];
      if (slug) actualRole = await prisma.role.findFirst({ where: { slug } });
    }
    if (!actualRole) {
      // Fallback: use first available role
      actualRole = await prisma.role.findFirst();
    }

    if (actualRole) {
      const existingUR = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: actualRole.id } });
      if (!existingUR) {
        try {
          await prisma.userRole.create({ data: { id: u.urId, userId: user.id, roleId: actualRole.id } });
        } catch {
          await prisma.userRole.create({ data: { userId: user.id, roleId: actualRole.id } });
        }
      }
    }

    console.log(`  ✅  ${u.email}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ DONE — Tous les comptes sont opérationnels!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n  Les mots de passe ont été fournis via les variables d’environnement.\n');
}

main()
  .catch(e => {
    console.error('\n❌ Erreur:', e.message);
    if (e.code) console.error('   Code:', e.code);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
