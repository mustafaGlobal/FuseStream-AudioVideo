import { types as mediasoupTypes } from 'mediasoup';
import { Room } from './ws-room-server';
import { config } from '../config';

interface ConferenceRoomConstructor {
  router: mediasoupTypes.Router;
  room: Room;
  roomId: string;
}

class ConferenceRoom {
  private roomId: string;
  private room: Room;
  private router: mediasoupTypes.Router;

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
    this.router = router;
    this.room = room;
    this.roomId = roomId;
  }

  public getId(): string {
    return this.roomId;
  }

  public getRoom(): Room {
    return this.room;
  }
}

export { ConferenceRoom };
