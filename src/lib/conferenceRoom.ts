import WebSocket from 'ws';
import { types as mediasoupTypes } from 'mediasoup';
import { createMediasoupRouter } from './worker';
import { createWebRtcTransport } from './createWebRtcTransport';
import { Room } from './ws-room-server';

class ConferenceRoom {
  private room: Room;
  private router: mediasoupTypes.Router | null;
  private producerTransports: mediasoupTypes.Transport[];
  private consumerTransports: mediasoupTypes.Transport[];

  static async createConferenceRoom() {
    const router = await createMediasoupRouter();
    return {
      router,
    };
  }

  constructor(roomId: string) {
    this.router = null;
    this.producerTransports = [];
    this.consumerTransports = [];
    this.room = new Room(roomId);
  }

  async init() {
    try {
      this.router = await createMediasoupRouter();
    } catch (error) {
      throw error;
    }
  }
}

export { ConferenceRoom };
