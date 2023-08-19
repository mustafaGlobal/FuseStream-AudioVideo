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
  }
}

export { PeerRequestHandler };
