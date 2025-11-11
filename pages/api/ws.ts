// lib/ws.ts
import { WebSocketServer } from "ws"
import type { WebSocket, RawData } from "ws"

interface BroadcastMessage {
  type: string
  payload: unknown
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()

  /**
   * Initialize WebSocket server (pass Node HTTP/S server)
   */
  initialize(server: unknown): void {
    this.wss = new WebSocketServer({ server })

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws)
      console.log(`🟢 Client connected (${this.clients.size} total)`)

      ws.on("message", (data: RawData) => {
        console.log("📩 Received:", data.toString())
      })

      ws.on("close", () => {
        this.clients.delete(ws)
        console.log(`🔴 Client disconnected (${this.clients.size} total)`)
      })

      ws.on("error", (err: Error) => {
        console.error("⚠️ WebSocket error:", err.message)
      })
    })
  }

  /**
   * Broadcast a structured message to all connected clients
   */
  broadcast(type: string, payload: unknown): void {
    const message: BroadcastMessage = { type, payload }
    const serialized = JSON.stringify(message)

    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.send(serialized)
      }
    }
  }

  /**
   * Return number of connected clients
   */
  getConnectedCount(): number {
    return this.clients.size
  }
}

/**
 * Singleton instance
 */
export const wsManager = new WebSocketManager()

/**
 * Helper function to broadcast payment events
 */
export function broadcastPayment(
  type: "payment.created" | "payment.updated" | "payment.reconciled",
  payload: Record<string, unknown>
): void {
  wsManager.broadcast(type, payload)
}
