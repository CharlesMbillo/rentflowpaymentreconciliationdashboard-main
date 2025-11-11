
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prismaClient';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const wss = new WebSocketServer({ port: 8081 });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body;

  try {
    const txn = await prisma.transaction.create({
      data: {
        reference: payload.transaction.reference,
        roomNumber: extractRoomNumber(payload.transaction.remarks),
        amount: payload.transaction.amount,
        status: payload.transaction.status,
        paymentMode: payload.transaction.paymentMode,
        remarks: payload.transaction.remarks,
        source: 'EQ_AGENT',
      },
    });

    wss.clients.forEach((client) => {
      client.send(JSON.stringify(txn));
    });

    res.status(200).json({ success: true, txn });
  } catch (err) {
    console.error('IPN Error:', err);
    res.status(500).json({ error: 'Failed to process IPN' });
  }
}

function extractRoomNumber(remarks: string) {
  const match = remarks?.match(/\b(\d{3,4})\b/);
  return match ? match[1] : 'UNKNOWN';
}
