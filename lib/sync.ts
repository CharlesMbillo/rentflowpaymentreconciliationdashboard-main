import db from './db'
import { PrismaClient as NeonClient } from '@prisma/client'

export async function syncOfflineTransactions() {
  const neon = new NeonClient()
  const localTxs = await db.transaction.findMany()

  for (const tx of localTxs) {
    const exists = await neon.transaction.findUnique({ where: { reference: tx.reference } })
    if (!exists) {
      await neon.transaction.create({ data: tx })
      console.log(`✅ Synced TX ${tx.reference}`)
    }
  }

  console.log('🔄 Offline transactions synchronized successfully')
}
