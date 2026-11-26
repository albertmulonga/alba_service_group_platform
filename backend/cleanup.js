const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Delete the duplicate admin I created
  const dupe = await p.user.findUnique({ where: { email: 'admin@alba-service.com' } });
  if (dupe) {
    await p.userRole.deleteMany({ where: { userId: dupe.id } });
    await p.user.delete({ where: { id: dupe.id } });
    console.log('Deleted duplicate admin: admin@alba-service.com');
  }

  // 2. Delete Caissier role
  const caissier = await p.role.findFirst({ where: { name: 'Caissier' } });
  if (caissier) {
    await p.userRole.deleteMany({ where: { roleId: caissier.id } });
    await p.role.delete({ where: { id: caissier.id } });
    console.log('Deleted Caissier role');
  }

  // 3. Verify final state
  const users = await p.user.findMany({ include: { roles: { include: { role: true } } } });
  console.log('\n=== FINAL USERS (' + users.length + ') ===');
  users.forEach(u => console.log(u.email, '|', u.firstName, u.lastName, '| roles:', u.roles.map(r => r.role?.name).join(', ') || 'NONE'));

  const roles = await p.role.findMany();
  console.log('\n=== FINAL ROLES (' + roles.length + ') ===');
  roles.forEach(r => console.log(r.name));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
