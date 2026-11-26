import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const USERS = [
  {
    email: 'admin@alba-service.com',
    username: 'admin',
    passwordEnv: 'ALBA_SEED_ADMIN_PASSWORD',
    firstName: 'Albert',
    lastName: 'Mulonga',
    position: 'Super Administrateur',
    roleSlug: 'super-admin',
    roleName: 'Super Administrateur',
  },
  {
    email: 'comptable@alba-service.com',
    username: 'comptable',
    passwordEnv: 'ALBA_SEED_COMPTABLE_PASSWORD',
    firstName: 'Pierre',
    lastName: 'Mutombo',
    position: 'Comptable',
    roleSlug: 'comptable',
    roleName: 'Comptable',
  },
  {
    email: 'imprimerie@alba-service.com',
    username: 'imprimerie',
    passwordEnv: 'ALBA_SEED_IMPRIMERIE_PASSWORD',
    firstName: 'Jean',
    lastName: 'Mukendi',
    position: 'Responsable Imprimerie',
    roleSlug: 'responsable-imprimerie',
    roleName: 'Responsable Imprimerie',
  },
  {
    email: 'graphiste@alba-service.com',
    username: 'graphiste',
    passwordEnv: 'ALBA_SEED_GRAPHISTE_PASSWORD',
    firstName: 'Marie',
    lastName: 'Kabange',
    position: 'Graphiste',
    roleSlug: 'graphiste',
    roleName: 'Graphiste',
  },
  {
    email: 'secretaire@alba-service.com',
    username: 'secretaire',
    passwordEnv: 'ALBA_SEED_SECRETAIRE_PASSWORD',
    firstName: 'Sophie',
    lastName: 'Banza',
    position: 'Secrétaire',
    roleSlug: 'secretaire',
    roleName: 'Secrétaire',
  },
  {
    email: 'developpeur@alba-service.com',
    username: 'developpeur',
    passwordEnv: 'ALBA_SEED_DEVELOPPEUR_PASSWORD',
    firstName: 'Paul',
    lastName: 'Ilunga',
    position: 'Développeur Full Stack',
    roleSlug: 'developpeur',
    roleName: 'Développeur',
  },
  {
    email: 'formateur@alba-service.com',
    username: 'formateur',
    passwordEnv: 'ALBA_SEED_FORMATEUR_PASSWORD',
    firstName: 'Grace',
    lastName: 'Tshiamba',
    position: 'Formateur IT',
    roleSlug: 'formateur',
    roleName: 'Formateur',
  },
]

function getSeedPassword(envName: string): string {
  const password = process.env[envName]
  if (!password) throw new Error(`Define ${envName} in the environment before running this script.`)
  return password
}

async function main() {
  console.log('🚀 Création des comptes utilisateurs ALBA SERVICE GROUP...\n')
  USERS.forEach(u => getSeedPassword(u.passwordEnv))

  // Get or create company
  let company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'ALBA SERVICE GROUP',
        slogan: 'Une seule plateforme pour gérer toute votre entreprise.',
        city: 'Kindu',
        province: 'Maniema',
        country: 'République Démocratique du Congo',
        email: 'contact@alba-service.com',
        currency: 'CDF',
      },
    })
    console.log(`✅ Entreprise créée: ${company.name}`)
  } else {
    console.log(`✅ Entreprise trouvée: ${company.name}`)
  }

  for (const u of USERS) {
    // Ensure role exists
    let role = await prisma.role.findUnique({ where: { slug: u.roleSlug } })
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: u.roleName,
          slug: u.roleSlug,
          description: `Rôle ${u.roleName}`,
          isSystem: u.roleSlug === 'super-admin',
        },
      })
      console.log(`  📋 Rôle créé: ${role.name}`)
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) {
      // Update password and ensure ACTIVE
      const hashed = await bcrypt.hash(getSeedPassword(u.passwordEnv), 10)
      await prisma.user.update({
        where: { email: u.email },
        data: {
          password: hashed,
          status: 'ACTIVE',
          mustChangePwd: false,
          firstName: u.firstName,
          lastName: u.lastName,
          position: u.position,
        },
      })
      // Ensure role is assigned
      const hasRole = await prisma.userRole.findFirst({ where: { userId: existing.id, roleId: role.id } })
      if (!hasRole) {
        await prisma.userRole.create({ data: { userId: existing.id, roleId: role.id } })
      }
      console.log(`  🔄 Compte mis à jour: ${u.email}`)
    } else {
      const hashed = await bcrypt.hash(getSeedPassword(u.passwordEnv), 10)
      // Generate unique username
      let username = u.username
      const existingUsername = await prisma.user.findUnique({ where: { username } })
      if (existingUsername) username = u.username + '_' + Date.now().toString(36)

      const newUser = await prisma.user.create({
        data: {
          email: u.email,
          username,
          password: hashed,
          firstName: u.firstName,
          lastName: u.lastName,
          position: u.position,
          companyId: company.id,
          status: 'ACTIVE',
          mustChangePwd: false,
        },
      })
      await prisma.userRole.create({ data: { userId: newUser.id, roleId: role.id } })
      console.log(`  ✅ Compte créé: ${u.email}`)
    }
  }

  console.log('\n✅ Tous les comptes sont prêts!\n')
  console.log('═══════════════════════════════════════════════')
  console.log('  COMPTES DISPONIBLES — ALBA SERVICE GROUP')
  console.log('═══════════════════════════════════════════════')
  USERS.forEach(u => console.log(`  📧 ${u.email}`))
  console.log('═══════════════════════════════════════════════\n')
}

main()
  .catch(e => { console.error('❌ Erreur:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
