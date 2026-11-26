import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface SocketUser {
  socketId: string;
  userId: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .filter(Boolean),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('ChatGateway');
  private onlineUsers = new Map<string, SocketUser[]>(); // userId -> sockets

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('🔌 Socket.IO Chat/WebRTC gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = this.jwtService.verify(token) as { sub: string };
      client.data.userId = payload.sub;

      const list = this.onlineUsers.get(payload.sub) || [];
      if (!list.some((s) => s.socketId === client.id)) {
        list.push({ socketId: client.id, userId: payload.sub });
      }
      this.onlineUsers.set(payload.sub, list);

      this.server.emit('presence:update', { onlineUserIds: this.getOnlineUserIds() });
    } catch (e: any) {
      this.logger.warn(`Socket auth failed: ${e?.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const list = (this.onlineUsers.get(userId) || []).filter((s) => s.socketId !== client.id);
      if (list.length === 0) this.onlineUsers.delete(userId);
      else this.onlineUsers.set(userId, list);
      this.server.emit('presence:update', { onlineUserIds: this.getOnlineUserIds() });
    }
  }

  private getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  private emitToUser(peerId: string, event: string, data: any) {
    const targets = this.onlineUsers.get(peerId) || [];
    targets.forEach((t) => this.server.to(t.socketId).emit(event, data));
  }

  // ── Calls / WebRTC signaling ──────────────────────────────

  handleCallOffer(client: Socket, payload: { peerId: string; signal: any; type: 'audio' | 'video'; from: any }) {
    this.emitToUser(payload.peerId, 'call:offer', {
      fromUserId: client.data.userId,
      signal: payload.signal,
      type: payload.type,
      from: payload.from,
    });
  }

  handleCallAnswer(client: Socket, payload: { peerId: string; signal: any }) {
    this.emitToUser(payload.peerId, 'call:answer', {
      fromUserId: client.data.userId,
      signal: payload.signal,
    });
  }

  handleCallCandidate(client: Socket, payload: { peerId: string; candidate: any }) {
    this.emitToUser(payload.peerId, 'call:candidate', {
      fromUserId: client.data.userId,
      candidate: payload.candidate,
    });
  }

  handleCallReject(client: Socket, payload: { peerId: string }) {
    this.emitToUser(payload.peerId, 'call:rejected', { fromUserId: client.data.userId });
  }

  handleCallEnd(client: Socket, payload: { peerId: string }) {
    this.emitToUser(payload.peerId, 'call:ended', { fromUserId: client.data.userId });
  }

  // ── Message relay between different machines ─────────────

  handleSendMessage(client: Socket, payload: { peerId: string; message: any }) {
    this.emitToUser(payload.peerId, 'message:incoming', {
      fromUserId: client.data.userId,
      message: payload.message,
    });
  }
}
