// /pages/api/jenga/ipn.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma/client'   // auto-generated Prisma client
import { wsManager } from '@/lib/wsManager'    // your broadcast utility

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    // ✅ Safely parse JSON body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    console.log('🟢 Jenga IPN received:', body)

    // ✅ Verify signature (optional but recommended)
    const signature = req.headers['x-jenga-signature'] as string
    const secret = process.env.JENGA_SECRET || ''
    if (secret && signature) {
      const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== hash) {
        console.error('❌ Invalid signature')
        return res.status(403).json({ message: 'Invalid signature' })
      }
    }

    // ✅ Normalize ALT/PDQ payloads
    const tx = body.transaction || {}
    const customer = body.customer || {}
    const bank = body.bank || {}

    const transactionData = {
      type: body.callbackType || 'ALT',
      amount: parseFloat(tx.amount) || 0,
      status: tx.status || 'UNKNOWN',
      reference: tx.reference || bank.reference || null,
      customerName: customer.name || null,
      customerReference: customer.reference || null,
      paymentMode: tx.paymentMode || null,
      remarks: tx.remarks || tx.additionalInfo || null,
      servedBy: tx.servedBy || null,
      account: bank.account || null,
      rawPayload: body,
      createdAt: new Date(tx.date || Date.now()),
    }

    // ✅ Persist to local Prisma database (SQLite or Neon)
    const saved = await prisma.transaction.create({
      data: transactionData as any,
    })

    // ✅ Broadcast to all active WebSocket clients
    wsManager.broadcast('payment.updated', saved)

    // ✅ Respond to Jenga immediately
    return res.status(200).json({ message: 'IPN received successfully' })
  } catch (err: any) {
    console.error('❌ IPN Error:', err)
    return res.status(500).json({ message: 'Server error', error: err.message })
  }
}
