import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let listeners = new Set<(event: string, ...args: any[]) => void>()

export function connectRealtime(token: string) {
  if (socket && socket.connected) return socket
  if (socket) socket.disconnect()
  socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
  })
  socket.onAny((event, ...args) => {
    listeners.forEach((fn) => fn(event, ...args))
  })
  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function onRealtime(cb: (event: string, ...args: any[]) => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  listeners.clear()
}
