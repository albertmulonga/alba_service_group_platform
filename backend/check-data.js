const { PrismaClient } = require('./node_modules/@prisma/client')
const p = new PrismaClient()

async function main() {
  const counts = {}
  for (const key of Object.keys(p)) {
    if (key.startsWith('$') || key.startsWith('_') || typeof p[key] !== 'object') continue
    if (p[key].count && typeof p[key].count === 'function') {
      try {
        const c = await p[key].count()
        if (c > 0) counts[key] = c
      } catch {}
    }
  }
  console.log(JSON.stringify(counts, null, 2))
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1) })
