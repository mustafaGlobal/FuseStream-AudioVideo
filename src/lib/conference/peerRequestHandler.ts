import { types as mediasoupTypes } from 'mediasoup';
import { ConferenceRoom } from './conferenceRoom';
import { Peer } from '../ws-room-server';
import {
  Request,
  connectWebRtcTransportRequest,
  createWebRtcTransportRequest,
  joinRequest,
  restartIceRequest,
} from '../ws-room-server/types';
import { config } from '../../config';
import { createLogger } from '../logger';

const logger = createLogger('peerRequestHandler');

class PeerRequestHandler {
  private conference: ConferenceRoom;
  private peer: Peer;
  private request: Request;
  private accept: Function;
  private reject: Function;

  constructor(
    conference: ConferenceRoom,
    peer: Peer,
    request: Request,
    accept: Function,
    reject: Function
  ) {
    this.conference = conference;
    this.peer = peer;
    this.request = request;
    this.accept = accept;
    this.reject = reject;
  }

  public handleRequest() {
    switch (this.request.method) {
      case 'getRouterRtpCapabilities':
        this.getRouterRtpCapabilities();
        break;

      case 'createWebRtcTransport':
        const createWebRtcTransportReq: createWebRtcTransportRequest =
          this.request.data;
        this.createWebRtcTransport(createWebRtcTransportReq);
        break;

      case 'connectWebRtcTransport':
        const connectWebRtcTransportReq: connectWebRtcTransportRequest =
          this.request.data;
        this.connectWebRtcTransport(connectWebRtcTransportReq);
        break;

      case 'restartIce':
        const restartIceReq: restartIceRequest = this.request.data;
        this.restartIce(restartIceReq);
        break;

      case 'join':
        const joinReq: joinRequest = this.request.data;
        this.join(joinReq);
        break;

      default:
        this.unsupportedRequest();
        break;
    }
  }

  private unsupportedRequest() {
    this.reject('unsuported method');
  }

  private getRouterRtpCapabilities() {
    this.accept(this.conference.getRouterRtpCapabilities());
  }

  private async createWebRtcTransport(request: createWebRtcTransportRequest) {
    let transportOptions: mediasoupTypes.WebRtcTransportOptions = {
      ...config.mediasoup.webRtcTransport,
      enableTcp: true,
      enableUdp: true,
      preferUdp: true,
      preferTcp: false,
      enableSctp: false,
      appData: {
        consuming: request.consuming,
        producing: request.producing,
      },
    };

    if (request.forceTcp) {
      transportOptions.enableTcp = true;
      transportOptions.enableUdp = false;
      transportOptions.preferTcp = true;
      transportOptions.preferUdp = false;
    }

    const transport = await this.conference.router.createWebRtcTransport(
      transportOptions
    );

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'failed' || dtlsState === 'closed')
        logger.warn(
          'WebRtcTransport "dtlsstatechange" event [dtlsState:%s]',
          dtlsState
        );
    });

    this.peer.data.transports.set(transport.id, transport);

    const { maxIncomingBitrate } = config.mediasoup.webRtcTransport;

    // If set, apply max incoming bitrate limit.
    if (maxIncomingBitrate) {
      try {
        await transport.setMaxIncomingBitrate(maxIncomingBitrate);
      } catch (error) {
        logger.error(
          'Failed setting incoming bitrate for transport error: %o',
          error
        );
      }
    }

    this.accept({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParamters: transport.dtlsParameters,
    });
  }

  private async connectWebRtcTransport(request: connectWebRtcTransportRequest) {
    const transport = this.peer.data.transports.get(request.transportId);
    if (!transport) {
      this.reject(`transport with id=${request.transportId} not found`);
      return;
    }

    await transport.connect({ dtlsParameters: request.dtlsParameters });
    this.accept();
  }

  private async restartIce(request: restartIceRequest) {
    const transport = this.peer.data.transports.get(request.transportId);
    if (!transport) {
      this.reject(`transport with id=${request.transportId} not found`);
      return;
    }
    const iceParameters = await transport.restartIce();

    this.accept({ iceParameters: iceParameters });
  }

  private join(request: joinRequest) {
    if (this.peer.data.joined) {
      this.reject('peer already joined');
      return;
    }

    this.peer.data.joined = true;
    this.peer.data.displayName = request.displayName;
    this.peer.data.device = request.device;
    this.peer.data.rtpCapabilites = request.rtpCapabilites;

    // reply to the joining peer with a list of already joined peers
    let conferenceParticipants = this.conference.getJoinedPeersExcluding(
      this.peer.id
    );

    console.log(this.conference.getJoinedPeers());

    let peerInfo = conferenceParticipants.map((p: Peer) => {
      return {
        id: p.id,
        displayName: p.data.displayName,
        device: p.data.device,
      };
    });

    this.accept({ peers: peerInfo });

    //TODO: setup consumers, producers and transports

    // Notify the new Peer to all other Peers.
    for (const otherPeer of this.conference.getJoinedPeersExcluding(
      this.peer.id
    )) {
      otherPeer.notify('newPeer', {
        id: this.peer.id,
        displayName: this.peer.data.displayName,
        device: this.peer.data.device,
      });
    }
  }
}

export { PeerRequestHandler };
