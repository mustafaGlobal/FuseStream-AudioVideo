import { types as mediasoupTypes } from 'mediasoup';
import { Request, Response, Notification, peerClosedNotification } from '../ws-room-server/types';
import { Peer, Room, WebSocketTransport } from '../ws-room-server';
import { config } from '../../config';
import { EventEmitter } from 'events';
import { createLogger } from '../logger';
import { PeerRequestHandler } from './peerRequestHandler';

const logger = createLogger('conference-room');

interface ConferenceRoomConstructor {
  router: mediasoupTypes.Router;
  room: Room;
  roomId: string;
}

class ConferenceRoom extends EventEmitter {
  public id: string;
  public router: mediasoupTypes.Router;
  public closed: boolean = false;
  public peerRoom: Room;

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

  public getJoinedPeers() {
    const peers = this.peerRoom.getPeers();

    const checkIfJoined = (peer: Peer) => {
      return peer.data.joined;
    };

    return peers.filter(checkIfJoined);
  }

  public getJoinedPeersExcluding(excludedPeerId: string) {
    const joinedPeers = this.getJoinedPeers();

    const checkIfExcluded = (peer: Peer) => {
      return peer.id !== excludedPeerId;
    };

    return joinedPeers.filter(checkIfExcluded);
  }

  public handleNewPeer(peerId: string, transport: WebSocketTransport) {
    if (this.peerRoom.hasPeer(peerId)) {
      logger.warn('handleNewPeer() | peer already joined closing it');
      this.peerRoom.getPeer(peerId)?.close();
    }

    let peer: Peer;

    try {
      peer = this.peerRoom.addPeer(peerId, transport);
    } catch (error) {
      logger.error('handleNewPeer() | failed to add new peer');
      return;
    }

    peer.addListener('close', () => {
      // if peer was joined notify other peers of his leave
      if (peer.data.joined) {
        this.getJoinedPeersExcluding(peer.id).forEach((p: Peer) => {
          const peerClosedNotificationData: peerClosedNotification = {
            peerId: peer.id,
          };
          p.notify('peerClosed', peerClosedNotificationData);
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

    peer.addListener('request', (request: Request, accept: Function, reject: Function) => {
      logger.debug('Peer got new request: %o', request);

      const peerRequestHandler = new PeerRequestHandler(this, peer, request, accept, reject);

      peerRequestHandler.handleRequest();
    });
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

  public getRouterRtpCapabilities(): mediasoupTypes.RtpCapabilities {
    return this.router.rtpCapabilities;
  }
}

export { ConferenceRoom };
