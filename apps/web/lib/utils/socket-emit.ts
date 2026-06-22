import type { Socket } from 'socket.io-client'

type WsAck<T> = { data: T } | { error: string }

export function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 10_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, ack: WsAck<T>) => {
      if (err) {
        reject(new Error(`WS timeout on "${event}"`))
        return
      }
      if ('error' in ack) {
        reject(new Error(ack.error))
        return
      }
      resolve(ack.data)
    })
  })
}
