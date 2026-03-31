// Run with: node prisma/seed.mjs
// Creates the admin account using ADMIN_EMAIL and ADMIN_PASSWORD from .env.local
// or falls back to the defaults below.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch {
  // .env.local not found — use defaults or existing env vars
}

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@collecttrack.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!'
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin'

const prisma = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: hashed, role: 'admin', name: ADMIN_NAME },
    create: { email: ADMIN_EMAIL, password: hashed, name: ADMIN_NAME, role: 'admin' },
  })

  console.log('')
  console.log('✅ Admin account ready')
  console.log('   Email:   ', admin.email)
  console.log('   Password:', ADMIN_PASSWORD)
  console.log('   Role:    ', admin.role)
  console.log('')
  console.log('Change your password after first login!')
  console.log('')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
