import { types as mediasoupTypes } from 'mediasoup';
import { ConferenceRoom } from './conferenceRoom';
import { Peer } from '../ws-room-server';
import {
  Request,
  closeProducerRequest,
  connectWebRtcTransportRequest,
  consumerClosedNotification,
  consumerLayersChangedNotification,
  consumerPausedNotification,
  createWebRtcTransportRequest,
  joinRequest,
  newConsumerRequest,
  newPeerNotification,
  pauseConsumerRequest,
  pauseProducerRequest,
  produceRequest,
  requestConsumerKeyFrameRequest,
  restartIceRequest,
  resumeConsumerRequest,
  resumeProducerRequest,
  setConsumerPreferredLayersRequest,
  setConsumerPriorityRequest,
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

  constructor(conference: ConferenceRoom, peer: Peer, request: Request, accept: Function, reject: Function) {
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
        const createWebRtcTransportReq: createWebRtcTransportRequest = this.request.data;
        this.createWebRtcTransport(createWebRtcTransportReq);
        break;

      case 'connectWebRtcTransport':
        const connectWebRtcTransportReq: connectWebRtcTransportRequest = this.request.data;
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

      case 'produce':
        const produceReq: produceRequest = this.request.data;
        this.produce(produceReq);
        break;

      case 'closeProducer':
        const closeProducerReq: closeProducerRequest = this.request.data;
        this.closeProducer(closeProducerReq);
        break;

      case 'pauseProducer':
        const pauseProducerReq: pauseProducerRequest = this.request.data;
        this.pauseProducer(pauseProducerReq);
        break;

      case 'resumeProducer':
        const resumeProducerReq: resumeProducerRequest = this.request.data;
        this.resumeProducer(resumeProducerReq);
        break;

      case 'pauseConsumer':
        const pauseConsumerReq: pauseConsumerRequest = this.request.data;
        this.pauseConsumer(pauseConsumerReq);
        break;

      case 'resumeConsumer':
        const resumeConsumerReq: resumeConsumerRequest = this.request.data;
        this.resumeConsumer(resumeConsumerReq);
        break;

      case 'setConsumerPreferredLayers':
        const setConsumerPreferredLayersReq: setConsumerPreferredLayersRequest = this.request.data;
        this.setConsumerPreferredLayers(setConsumerPreferredLayersReq);
        break;

      case 'setConsumerPriority':
        const setConsumerPriorityReq: setConsumerPriorityRequest = this.request.data;
        this.setConsumerPriority(setConsumerPriorityReq);
        break;

      case 'requestConsumerKeyFrame':
        const requestConsumerKeyFrameReq: requestConsumerKeyFrameRequest = this.request.data;
        this.requestConsumerKeyFrame(requestConsumerKeyFrameReq);
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

    const transport = await this.conference.router.createWebRtcTransport(transportOptions);

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'failed' || dtlsState === 'closed')
        logger.warn('WebRtcTransport "dtlsstatechange" event [dtlsState:%s]', dtlsState);
    });

    this.peer.data.transports.set(transport.id, transport);

    const { maxIncomingBitrate } = config.mediasoup.webRtcTransport;

    // If set, apply max incoming bitrate limit.
    if (maxIncomingBitrate) {
      try {
        await transport.setMaxIncomingBitrate(maxIncomingBitrate);
      } catch (error) {
        logger.error('Failed setting incoming bitrate for transport error: %o', error);
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
    let conferenceParticipants = this.conference.getJoinedPeersExcluding(this.peer.id);

    let peerInfo = conferenceParticipants.map((p: Peer) => {
      return {
        id: p.id,
        displayName: p.data.displayName,
        device: p.data.device,
      };
    });

    this.accept({ peers: peerInfo });

    for (const producerPeer of conferenceParticipants) {
      for (const producer of producerPeer.data.producers.values()) {
        this.createConsumer({
          consumerPeer: this.peer,
          producerPeer: producerPeer,
          producer: producer,
        });
      }
    }

    // Notify the new Peer to all other Peers.
    for (const otherPeer of this.conference.getJoinedPeersExcluding(this.peer.id)) {
      const newPeerNotificationData: newPeerNotification = {
        id: this.peer.id,
        displayName: this.peer.data.displayName,
        device: this.peer.data.device,
      };
      otherPeer.notify('newPeer', newPeerNotificationData);
    }
  }

  private async createConsumer(opts: { consumerPeer: Peer; producerPeer: Peer; producer: mediasoupTypes.Producer }) {
    // If remote peer can't consume it dont create a consumer
    if (
      !opts.consumerPeer.data.rtpCapabilites ||
      !this.conference.router.canConsume({
        producerId: opts.producer.id,
        rtpCapabilities: opts.consumerPeer.data.rtpCapabilites,
      })
    ) {
      return;
    }

    const transport = Array.from(opts.consumerPeer.data.transports.values()).find((t) => t.appData.consuming);
    if (!transport) {
      logger.error('createConsumer() | Transport for consuming not found');
      return;
    }

    let consumer: mediasoupTypes.Consumer;

    try {
      consumer = await transport.consume({
        producerId: opts.producer.id,
        rtpCapabilities: opts.consumerPeer.data.rtpCapabilites,
        enableRtx: true,
        paused: true,
      });
    } catch (error) {
      logger.warn('createConsumer() | transport.consumer error %o', error);
      return;
    }

    // Store the new consumer
    opts.consumerPeer.data.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      opts.consumerPeer.data.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      opts.consumerPeer.data.consumers.delete(consumer.id);
      const consumerClosedNotificationData: consumerClosedNotification = {
        peerId: opts.producerPeer.id,
        consumerId: consumer.id,
      };
      opts.consumerPeer.notify('consumerClosed', consumerClosedNotificationData);
    });

    consumer.on('producerpause', () => {
      const consumerPausedNotificationData: consumerPausedNotification = {
        peerId: opts.producerPeer.id,
        consumerId: consumer.id,
      };
      opts.consumerPeer.notify('consumerPaused', consumerPausedNotificationData);
    });

    consumer.on('producerresume', () => {
      const consumerResumedNotificationData: consumerPausedNotification = {
        peerId: opts.producerPeer.id,
        consumerId: consumer.id,
      };
      opts.consumerPeer.notify('consumerResumed', consumerResumedNotificationData);
    });

    consumer.on('layerschange', (layers) => {
      const consumerLayersChangedNotificationData: consumerLayersChangedNotification = {
        peerId: opts.producerPeer.id,
        consumerId: consumer.id,
        spatialLayer: layers ? layers.spatialLayer : null,
        temporalLayer: layers ? layers.temporalLayer : null,
      };

      opts.consumerPeer.notify('consumerLayersChanged', consumerLayersChangedNotificationData);
    });

    const newConsumer: newConsumerRequest = {
      peerId: opts.producerPeer.id,
      producerId: opts.producer.id,
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      appData: consumer.appData,
      producerPaused: consumer.producerPaused,
    };

    await opts.consumerPeer.request('newConsumer', newConsumer);

    await consumer.resume();
  }

  private async produce(request: produceRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const transport = this.peer.data.transports.get(request.transportId);
    if (!transport) {
      this.reject(`transport with id "${request.transportId}" not found`);
      return;
    }

    if (request.kind != 'video') {
      this.reject('only video is supported');
      return;
    }

    // attach peerId to appData
    request.appData = { ...request.appData, peerId: this.peer.id };

    const producer = await transport.produce({
      kind: request.kind,
      rtpParameters: request.rtpParameters,
      appData: request.appData,
      keyFrameRequestDelay: 2000,
    });

    this.peer.data.producers.set(producer.id, producer);

    this.accept({ id: producer.id });

    //create consumers for producer
    for (const p of this.conference.getJoinedPeersExcluding(this.peer.id)) {
      this.createConsumer({
        consumerPeer: p,
        producerPeer: this.peer,
        producer,
      });
    }
  }

  private closeProducer(request: closeProducerRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const producer = this.peer.data.producers.get(request.producerId);
    if (!producer) {
      this.reject(`producer with id "${request.producerId}" not found`);
      return;
    }

    producer.close();
    this.peer.data.producers.delete(producer.id);

    this.accept();
  }

  private async pauseProducer(request: pauseProducerRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const producer = this.peer.data.producers.get(request.producerId);
    if (!producer) {
      this.reject(`producer with id "${request.producerId}" not found`);
      return;
    }

    await producer.pause();

    this.accept();
  }

  private async resumeProducer(request: resumeProducerRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const producer = this.peer.data.producers.get(request.producerId);
    if (!producer) {
      this.reject(`producer with id "${request.producerId}" not found`);
      return;
    }

    await producer.resume();

    this.accept();
  }

  private async pauseConsumer(request: pauseConsumerRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const consumer = this.peer.data.consumers.get(request.consumerId);
    if (!consumer) {
      this.reject(`consumer with id "${request.consumerId}" not found`);
      return;
    }

    await consumer.pause();

    this.accept();
  }

  private async resumeConsumer(request: resumeConsumerRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const consumer = this.peer.data.consumers.get(request.consumerId);
    if (!consumer) {
      this.reject(`consumer with id "${request.consumerId}" not found`);
      return;
    }

    await consumer.resume();

    this.accept();
  }

  private async setConsumerPreferredLayers(request: setConsumerPreferredLayersRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const consumer = this.peer.data.consumers.get(request.consumerId);
    if (!consumer) {
      this.reject(`consumer with id "${request.consumerId}" not found`);
      return;
    }

    await consumer.setPreferredLayers({ spatialLayer: request.spatialLayer, temporalLayer: request.temporalLayer });

    this.accept();
  }

  private async setConsumerPriority(request: setConsumerPriorityRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const consumer = this.peer.data.consumers.get(request.consumerId);
    if (!consumer) {
      this.reject(`consumer with id "${request.consumerId}" not found`);
      return;
    }

    await consumer.setPriority(request.priority);

    this.accept();
  }

  private async requestConsumerKeyFrame(request: requestConsumerKeyFrameRequest) {
    if (!this.peer.data.joined) {
      this.reject('peer not joined');
      return;
    }

    const consumer = this.peer.data.consumers.get(request.consumerId);
    if (!consumer) {
      this.reject(`consumer with id "${request.consumerId}" not found`);
      return;
    }

    await consumer.requestKeyFrame();

    this.accept();
  }
}

export { PeerRequestHandler };
