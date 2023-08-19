import { types as mediasoupTypes } from 'mediasoup';
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

// interface ConferenceParticipant {
//   id: string;
//   name: string;
//   device: any;
//   RTCRtpCapabilites: mediasoupTypes.RtpCapabilities;
//   transports: Map<string, mediasoupTypes.Transport>;
//   producers: Map<string, mediasoupTypes.Producer>;
//   consumers: Map<string, mediasoupTypes.Consumer>;
//   dataProducers: Map<string, mediasoupTypes.DataProducer>;
//   dataConsumers: Map<string, mediasoupTypes.DataConsumer>;
//   peer: Peer;
// }

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

  public getRouterRtpCapabilities(): mediasoupTypes.RtpCapabilities {
    return this.router.rtpCapabilities;
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

    peer.data.joined = true;
    peer.data.displayName = null;
    peer.data.device = null;
    peer.data.rtpCapabilities = null;
    peer.data.sctpCapabilites = null;

    peer.data.transports = new Map();
    peer.data.producers = new Map();
  }

  public close(): void {
    logger.debug('close()');
    this.emit('close');

    this.closed = true;
    this.router.close();
    this.peerRoom.close();
  }

  public isClosed(): boolean {
    return this.closed;
  }
}

export { ConferenceRoom };
