import { types as mediasoupTypes } from 'mediasoup';
import { ConferenceRoom } from './conferenceRoom';
import { Peer } from '../ws-room-server';
import { Request, createWebRtcTransportReq } from '../ws-room-server/types';
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
        const req: createWebRtcTransportReq = this.request.data;
        this.createWebRtcTransport(req);
        break;

      case 'join':
        this.join();
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

  private async createWebRtcTransport(request: createWebRtcTransportReq) {
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

    this.accept({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParamters: transport.dtlsParameters,
    });
  }

  private join() {
    if (this.peer.data.joined) {
      this.reject('peer already joined');
      return;
    }

    const { displayName, device, rtpCapabilites } = this.request.data;

    this.peer.data.joined = true;
    this.peer.data.displayName = displayName;
    this.peer.data.device = device;
    this.peer.data.rtpCapabilites = rtpCapabilites;

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
