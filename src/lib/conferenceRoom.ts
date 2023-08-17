import { types as mediasoupTypes } from 'mediasoup';
import { Peer, Room } from './ws-room-server';
import { config } from '../config';
import { EventEmitter } from 'events';
import { createLogger } from './logger';

const logger = createLogger('conference-room-constructor');

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
  }

  public getId(): string {
    return this.id;
  }

  public getPeer(peerId: string): Peer | undefined {
    return this.peerRoom.getPeer(peerId);
  }

  public getPeers(): Peer[] {
    return this.peerRoom.getPeers();
  }

  public getRouterRtpCapabilities(): mediasoupTypes.RtpCapabilities {
    return this.router.rtpCapabilities;
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
