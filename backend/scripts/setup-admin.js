/**
 * setup-admin.js
 * Crée ou met à jour le compte admin principal avec les vraies credentials
 * Usage: set ALBA_ADMIN_PASSWORD in the environment, then run this script.
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

const ADMIN = {
  email: 'albertmulonga531@gmail.com',
  username: 'albert.mulonga',
  passwordEnv: 'ALBA_ADMIN_PASSWORD',
  firstName: 'Albert',
  lastName: 'Mulonga',
  position: 'Super Administrateur',
}

async function main() {
  console.log('\n=== ALBA SERVICE GROUP — Setup Admin ===\n')
  const adminPassword = process.env[ADMIN.passwordEnv]
  if (!adminPassword) throw new Error(`Define ${ADMIN.passwordEnv} in the environment before running this script.`)

  // Get or create company
  let company = await prisma.company.findFirst()
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'ALBA SERVICE GROUP',
        slogan: 'Une seule plateforme pour gérer toute votre entreprise.',
        address: 'Avenue Lumumba, Kindu',
        city: 'Kindu',
        province: 'Maniema',
        country: 'République Démocratique du Congo',
        phone: '+243 000 000 000',
        email: 'contact@alba-service.com',
        currency: 'CDF',
        timezone: 'Africa/Lubumbashi',
        primaryColor: '#1E3A8A',
      }
    })
    console.log('✅ Company created:', company.name)
  } else {
    console.log('✅ Company found:', company.name)
  }

  // Get or create Super Admin role
  let adminRole = await prisma.role.findFirst({ where: { slug: 'super-admin' } })
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'Super Administrateur',
        slug: 'super-admin',
        description: 'Accès complet à tous les modules',
        isSystem: true,
      }
    })
    console.log('✅ Role created:', adminRole.name)
  } else {
    console.log('✅ Role found:', adminRole.name)
  }

  const hashed = await bcrypt.hash(adminPassword, 12)

  // Check if old admin exists
  const oldAdmin = await prisma.user.findUnique({ where: { email: 'admin@alba-service.com' } })
  if (oldAdmin) {
    // Update email and password of existing admin
    await prisma.user.update({
      where: { id: oldAdmin.id },
      data: {
        email: ADMIN.email,
        username: ADMIN.username,
        password: hashed,
        firstName: ADMIN.firstName,
        lastName: ADMIN.lastName,
        position: ADMIN.position,
        status: 'ACTIVE',
        mustChangePwd: false,
      }
    })
    console.log('✅ Admin updated:', ADMIN.email)

    // Ensure role assigned
    const hasRole = await prisma.userRole.findFirst({ where: { userId: oldAdmin.id, roleId: adminRole.id } })
    if (!hasRole) {
      await prisma.userRole.create({ data: { userId: oldAdmin.id, roleId: adminRole.id } })
    }
  } else {
    // Check if new email already exists
    const existing = await prisma.user.findUnique({ where: { email: ADMIN.email } })
    if (existing) {
      await prisma.user.update({
        where: { email: ADMIN.email },
        data: { password: hashed, status: 'ACTIVE', mustChangePwd: false }
      })
      console.log('✅ Admin password updated:', ADMIN.email)
    } else {
      // Check username uniqueness
      const usernameExists = await prisma.user.findFirst({ where: { username: ADMIN.username } })
      const username = usernameExists ? ADMIN.username + '_' + Date.now().toString(36) : ADMIN.username

      const newUser = await prisma.user.create({
        data: {
          companyId: company.id,
          email: ADMIN.email,
          username,
          password: hashed,
          firstName: ADMIN.firstName,
          lastName: ADMIN.lastName,
          position: ADMIN.position,
          status: 'ACTIVE',
          mustChangePwd: false,
        }
      })
      console.log('✅ Admin created:', ADMIN.email)
      await prisma.userRole.create({ data: { userId: newUser.id, roleId: adminRole.id } })
    }
  }

  console.log('\n=== DONE ===\n')
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
