import SafeEventEmitter from '../utils/safeEventEmitter';
import { Peer } from './peer';
import { createLogger } from '../../logger';
import { WebSocketTransport } from '../transport/webSocketTransport';

const logger = createLogger('room');

class Room extends SafeEventEmitter {
  private closed: boolean;
  private roomId: string;
  private peers: Map<string, Peer>;

  constructor(roomId: string) {
    super();
    this.roomId = roomId;
    this.peers = new Map<string, Peer>();
    this.closed = false;
  }

  public addPeer(peerId: string, transport: WebSocketTransport): void {
    if (this.peers.has(peerId)) {
      transport.close();
      throw Error(
        `peer with same peerID:${peerId} already exists in room with roomId:${this.roomId}`
      );
    }
    const peer = new Peer(transport);
    this.peers.set(peerId, peer);

    peer.on('close', () => {
      this.removePeer(peerId);
    });
  }

  public removePeer(id: string): boolean {
    return this.peers.delete(id);
  }

  public hasPeer(id: string): Boolean {
    return this.peers.has(id);
  }

  public getPeer(id: string): Peer | undefined {
    return this.peers.get(id);
  }

  public getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  public getNumberOfPeers(): number {
    return this.peers.size;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public isClosed(): boolean {
    return this.closed;
  }

  public close(): void {
    if (this.closed) {
      return;
    }

    logger.debug('close() roomId: %s', this.roomId);

    for (const peer of this.peers.values()) {
      peer.close();
    }

    this.closed = true;

    this.safeEmit('close');
  }
}

export { Room };
