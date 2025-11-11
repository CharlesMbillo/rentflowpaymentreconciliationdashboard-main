import { PrismaClient as NeonClient } from '@prisma/client'
import { PrismaClient as LocalClient } from '@prisma/client'
import { execSync } from 'child_process'

let db: NeonClient | LocalClient

try {
  // Try to reach Neon/Postgres
  execSync('ping -c 1 db.neon.tech', { stdio: 'ignore' })
  db = new NeonClient()
  console.log('✅ Using NeonDB datasource')
} catch {
  db = new LocalClient({ datasources: { db: { url: 'file:./dev.db' } } })
  console.warn('⚠️ Falling back to local SQLite datasource')
}

export default db
