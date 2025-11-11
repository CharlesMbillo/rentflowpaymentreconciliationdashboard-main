import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyJengaHMAC, parseAccountNumber, type JengaIPNPayload } from "@/lib/jenga-ipn"
import { updatePaymentStatus } from "@/lib/actions/payments"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    const signature = request.headers.get("x-jenga-signature") || ""
    const jengaSecret = process.env.JENGA_SECRET || "your-jenga-secret-key"

    // Log incoming payload
    const inserted = await sql`
      INSERT INTO ipn_logs (transaction_reference, payload, hmac_signature, verified, processed)
      VALUES ('pending', ${raw}, ${signature}, false, false)
      RETURNING id
    `
    const ipnLogId = inserted[0].id

    // Verify HMAC
    const isValid = verifyJengaHMAC(raw, signature, jengaSecret)
    if (!isValid) {
      await sql`
        UPDATE ipn_logs
        SET error_message = 'Invalid HMAC signature', verified = false
        WHERE id = ${ipnLogId}
      `
      return NextResponse.json({ status: "error", message: "Invalid signature" }, { status: 401 })
    }

    const payload = JSON.parse(raw) as JengaIPNPayload

    await sql`
      UPDATE ipn_logs
      SET transaction_reference = ${payload.transactionReference}, verified = true
      WHERE id = ${ipnLogId}
    `

    if (payload.status !== "SUCCESS") {
      await sql`
        UPDATE ipn_logs
        SET processed = true, error_message = ${`Payment status: ${payload.status}`}
        WHERE id = ${ipnLogId}
      `
      return NextResponse.json({ status: "ok", message: "Payment not successful" })
    }

    const accountInfo = parseAccountNumber(payload.accountNumber)
    if (accountInfo.type === "unknown" || !accountInfo.id) {
      await sql`
        UPDATE ipn_logs
        SET processed = true, error_message = 'Invalid account number format'
        WHERE id = ${ipnLogId}
      `
      return NextResponse.json({ status: "error", message: "Invalid account number" }, { status: 400 })
    }

    // Fetch lease + tenant info
    const lease = accountInfo.type === "lease"
      ? await sql`
          SELECT l.id, l.tenant_id, r.id as room_id
          FROM leases l
          JOIN rooms r ON l.room_id = r.id
          WHERE l.id = ${accountInfo.id} AND l.status = 'active'
          LIMIT 1
        `
      : await sql`
          SELECT l.id, l.tenant_id, r.id as room_id
          FROM leases l
          JOIN rooms r ON l.room_id = r.id
          WHERE l.tenant_id = ${accountInfo.id} AND l.status = 'active'
          LIMIT 1
        `

    if (lease.length === 0) {
      await sql`
        UPDATE ipn_logs
        SET processed = true, error_message = 'No active lease found'
        WHERE id = ${ipnLogId}
      `
      return NextResponse.json({ status: "error", message: "No active lease found" }, { status: 404 })
    }

    const { id: leaseId, tenant_id: tenantId, room_id: roomId } = lease[0]

    const existing = await sql`
      SELECT id FROM payments WHERE transaction_reference = ${payload.transactionReference} LIMIT 1
    `
    if (existing.length > 0) {
      await sql`
        UPDATE ipn_logs SET processed = true, error_message = 'Duplicate transaction' WHERE id = ${ipnLogId}
      `
      return NextResponse.json({ status: "ok", message: "Payment already processed" })
    }

    const monthYear = new Date(payload.transactionDate).toISOString().slice(0, 7)

    await sql`
      INSERT INTO payments (
        lease_id, tenant_id, amount, payment_date, payment_method,
        transaction_reference, jenga_transaction_id, payment_type, status, month_year
      )
      VALUES (
        ${leaseId}, ${tenantId}, ${payload.amount}, ${payload.transactionDate},
        'jenga_pgw', ${payload.transactionReference}, ${payload.transactionReference},
        'rent', 'completed', ${monthYear}
      )
      ON CONFLICT (transaction_reference) DO NOTHING
    `

    await updatePaymentStatus(leaseId, roomId, monthYear)

    await sql`
      UPDATE ipn_logs SET processed = true, processed_at = CURRENT_TIMESTAMP WHERE id = ${ipnLogId}
    `

    return NextResponse.json({ status: "success", message: "Payment processed successfully" })
  } catch (error: any) {
    console.error("[v0] Jenga IPN Error:", error)
    return NextResponse.json(
      { status: "error", message: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
