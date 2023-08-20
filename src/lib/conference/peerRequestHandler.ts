import { ConferenceRoom } from './conferenceRoom';
import { Peer } from '../ws-room-server';
import { Request } from '../ws-room-server/types';

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

      case 'join':
        this.join();
        break;

      default:
        this.unsupportedRequest();
        break;
    }
  }

  public unsupportedRequest() {
    this.reject('unsuported method');
  }

  public getRouterRtpCapabilities() {
    this.accept(this.conference.getRouterRtpCapabilities());
  }

  public join() {
    if (this.peer.data.joined) {
      this.reject('peer already joined');
      return;
    }

    const { displayName, device, rtpCapabilites, sctpCapabilites } =
      this.request.data;

    this.peer.data.joined = true;
    this.peer.data.displayName = displayName;
    this.peer.data.device = device;
    this.peer.data.rtpCapabilites = rtpCapabilites;
    this.peer.data.sctpCapabilites = sctpCapabilites;

    // reply to the joining peer with a list of already joined peers
    const conferenceParticipants = this.conference.getJoinedPeersExcluding(
      this.peer.id
    );

    let peerInfo = conferenceParticipants.map((p) => {
      return {
        id: p.id,
        displayName: p.data.displayName,
        device: p.data.device,
      };
    });

    this.accept({ peers: peerInfo });

    //TODO setup consumers, producers and transports

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
