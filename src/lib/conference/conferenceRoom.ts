import { types as mediasoupTypes } from 'mediasoup';
import { Request, Response, Notification } from '../ws-room-server/types';
import { Peer, Room, WebSocketTransport } from '../ws-room-server';
import { config } from '../../config';
import { EventEmitter } from 'events';
import { createLogger } from '../logger';

const logger = createLogger('conference-room');

interface ConferenceRoomConstructor {
  router: mediasoupTypes.Router;
  room: Room;
  roomId: string;
}

class ConferenceRoom extends EventEmitter {
  private id: string;
  private peerRoom: Room;
  private router: mediasoupTypes.Router;
  private closed: boolean = false;

  static async create(worker: mediasoupTypes.Worker, roomId: string) {
    try {
      const { mediaCodecs } = config.mediasoup.router;

      const router = await worker.createRouter({ mediaCodecs });

      const room = new Room(roomId);
      return new ConferenceRoom({
        router,
        room,
        roomId,
      });
    } catch (error) {
      throw error;
    }
  }

  constructor({ router, room, roomId }: ConferenceRoomConstructor) {
    super();

    this.router = router;
    this.peerRoom = room;
    this.id = roomId;

    this.peerRoom.addListener('close', () => {
      this.close();
    });
  }

  public getId(): string {
    return this.id;
  }

  public hasPeer(peerId: string): boolean {
    return this.peerRoom.hasPeer(peerId);
  }

  public getPeer(peerId: string): Peer | undefined {
    return this.peerRoom.getPeer(peerId);
  }

  public getPeers(): Peer[] {
    return this.peerRoom.getPeers();
  }

  public getJoinedPeers() {
    return this.getPeers().filter((p: Peer) => {
      p.data.joined === true;
    });
  }

  public getJoinedPeersExcluding(excludedPeerId: string) {
    return this.getPeers().filter((p: Peer) => {
      p.data.joined === true && p.id !== excludedPeerId;
    });
  }

  public handleNewPeer(peerId: string, transport: WebSocketTransport) {
    if (this.hasPeer(peerId)) {
      logger.warn('handleNewPeer() | peer already joined closing it');
      this.getPeer(peerId)?.close();
    }

    let peer: Peer;

    try {
      peer = this.peerRoom.addPeer(peerId, transport);
    } catch (error) {
      logger.error('handleNewPeer() | failed to add new peer');
      return;
    }

    peer.addListener('close', () => {
      if (this.closed) {
        return;
      }

      // if peer was joined notify other peers of his leave
      if (peer.data.joined) {
        this.getJoinedPeersExcluding(peer.id).forEach((p) => {
          p.notify('peerClosed', { peerId: p.id });
        });
      }

      //close all of the transports
      for (const transport of peer.data.transports.values()) {
        transport.close();
      }

      // if the peer was last one left close the whole conference
      if (this.peerRoom.isEmpty()) {
        this.close();
      }
    });

    peer.addListener(
      'request',
      (request: Request, accept: Function, reject: Function) => {
        logger.debug('Peer got new request: %o', request);
        this.handlePeerRequest(request, peer, accept, reject);
      }
    );
  }

  public close(): void {
    if (this.closed) {
      return;
    }

    logger.debug('close()');
    this.emit('close');

    this.closed = true;
    this.router.close();
    this.peerRoom.close();
  }

  public isClosed(): boolean {
    return this.closed;
  }

  public getRouterRtpCapabilities(): mediasoupTypes.RtpCapabilities {
    return this.router.rtpCapabilities;
  }

  private handlePeerRequest(
    request: Request,
    peer: Peer,
    accept: Function,
    reject: Function
  ) {
    switch (request.method) {
      case 'getRouterRtpCapabilities':
        accept(this.getRouterRtpCapabilities());
        break;

      default:
        break;
    }
  }
}

export { ConferenceRoom };
