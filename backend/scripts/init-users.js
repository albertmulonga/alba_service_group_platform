const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

const USERS = [
  { email: 'admin@alba-service.com',       username: 'admin',       passwordEnv: 'ALBA_SEED_ADMIN_PASSWORD',       firstName: 'Albert',  lastName: 'Mulonga',   position: 'Super Administrateur', roleSlug: 'super-admin' },
  { email: 'comptable@alba-service.com',   username: 'comptable',   passwordEnv: 'ALBA_SEED_COMPTABLE_PASSWORD',   firstName: 'Pierre',  lastName: 'Mutombo',   position: 'Comptable',             roleSlug: 'comptable' },
  { email: 'imprimerie@alba-service.com',  username: 'imprimerie',  passwordEnv: 'ALBA_SEED_IMPRIMERIE_PASSWORD',  firstName: 'Jean',    lastName: 'Mukendi',   position: 'Resp. Imprimerie',      roleSlug: 'super-admin' },
  { email: 'graphiste@alba-service.com',   username: 'graphiste',   passwordEnv: 'ALBA_SEED_GRAPHISTE_PASSWORD',   firstName: 'Marie',   lastName: 'Kabange',   position: 'Graphiste',             roleSlug: 'super-admin' },
  { email: 'secretaire@alba-service.com',  username: 'secretaire',  passwordEnv: 'ALBA_SEED_SECRETAIRE_PASSWORD',  firstName: 'Sophie',  lastName: 'Banza',     position: 'Secretaire',            roleSlug: 'super-admin' },
  { email: 'developpeur@alba-service.com', username: 'dev',         passwordEnv: 'ALBA_SEED_DEVELOPPEUR_PASSWORD', firstName: 'Paul',    lastName: 'Ilunga',    position: 'Developpeur Full Stack', roleSlug: 'super-admin' },
  { email: 'formateur@alba-service.com',   username: 'formateur',   passwordEnv: 'ALBA_SEED_FORMATEUR_PASSWORD',   firstName: 'Grace',   lastName: 'Tshiamba',  position: 'Formateur IT',          roleSlug: 'super-admin' },
  { email: 'technicien@alba-service.com',  username: 'technicien',  passwordEnv: 'ALBA_SEED_TECHNICIEN_PASSWORD',  firstName: 'David',   lastName: 'Kasongo',   position: 'Technicien IT',         roleSlug: 'super-admin' },
  { email: 'caissier@alba-service.com',    username: 'caissier',    passwordEnv: 'ALBA_SEED_CAISSIER_PASSWORD',    firstName: 'Alice',   lastName: 'Mwamba',    position: 'Caissiere',             roleSlug: 'super-admin' },
]

function getSeedPassword(envName) {
  const password = process.env[envName]
  if (!password) throw new Error(`Define ${envName} in the environment before running this script.`)
  return password
}

async function main() {
  console.log('\n=== ALBA SERVICE GROUP — Init Users ===\n')
  USERS.forEach(u => getSeedPassword(u.passwordEnv))

  // Get company
  const company = await prisma.company.findFirst()
  if (!company) { console.error('No company found. Run create-admin.js first.'); process.exit(1) }
  console.log('Company:', company.name)

  // Get default role (super-admin)
  const defaultRole = await prisma.role.findFirst({ where: { slug: 'super-admin' } })
  if (!defaultRole) { console.error('No role found.'); process.exit(1) }
  console.log('Default role:', defaultRole.name)

  let created = 0, updated = 0

  for (const u of USERS) {
    const hashed = await bcrypt.hash(getSeedPassword(u.passwordEnv), 10)

    // Check by email
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    let userId

    if (existing) {
      // Just update password and ensure ACTIVE
      await prisma.user.update({
        where: { email: u.email },
        data: { password: hashed, status: 'ACTIVE', mustChangePwd: false }
      })
      userId = existing.id
      updated++
    } else {
      // Check username uniqueness
      let uname = u.username
      const ue = await prisma.user.findFirst({ where: { username: uname } })
      if (ue) uname = uname + '_' + Math.random().toString(36).slice(2, 5)

      const nu = await prisma.user.create({
        data: {
          companyId: company.id,
          email: u.email,
          username: uname,
          password: hashed,
          firstName: u.firstName,
          lastName: u.lastName,
          position: u.position,
          status: 'ACTIVE',
          mustChangePwd: false,
        }
      })
      userId = nu.id
      created++

      // Assign role
      const hasRole = await prisma.userRole.findFirst({ where: { userId, roleId: defaultRole.id } })
      if (!hasRole) {
        await prisma.userRole.create({ data: { userId, roleId: defaultRole.id } })
      }
    }

    console.log(`  ${existing ? 'Updated' : 'Created'}: ${u.email}`)
  }

  console.log(`\nDone: ${created} created, ${updated} updated\n`)
  console.log('Credentials were provided through the environment.')
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
