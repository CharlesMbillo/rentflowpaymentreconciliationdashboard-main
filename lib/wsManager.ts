import { WebSocketServer } from 'ws'

class WSManager {
  private wss: WebSocketServer

  constructor() {
    this.wss = new WebSocketServer({ noServer: true })
  }

  attachServer(server: any) {
    server.on('upgrade', (req: any, socket: any, head: any) => {
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit('connection', ws, req)
      })
    })
  }

  broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data })
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(message)
    })
  }
}

export const wsManager = new WSManager()
