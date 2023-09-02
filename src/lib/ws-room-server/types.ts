import { types as mediasoupTypes } from 'mediasoup';

type RequestResponseMethod =
  | 'getRouterRtpCapabilities'
  | 'createWebRtcTransport'
  | 'connectWebRtcTransport'
  | 'restartIce'
  | 'join'
  | 'newConsumer'
  | 'produce'
  | 'closeProducer';

type NotificationMethod =
  | 'peerClosed'
  | 'newPeer'
  | 'consumerClosed'
  | 'consumerPaused'
  | 'consumerResumed'
  | 'consumerLayersChanged';

type Method = RequestResponseMethod | NotificationMethod;

enum MsgType {
  Request = 0,
  Response = 1,
  Notification = 2,
}

interface Request {
  type: MsgType.Request;
  method: RequestResponseMethod;
  id: string;
  data: any;
}

interface createWebRtcTransportRequest {
  forceTcp: boolean;
  producing: boolean;
  consuming: boolean;
}

interface connectWebRtcTransportRequest {
  transportId: string;
  dtlsParameters: mediasoupTypes.DtlsParameters;
}

interface restartIceRequest {
  transportId: string;
}

interface joinRequest {
  displayName: string;
  device: object;
  rtpCapabilites: mediasoupTypes.RtpCapabilities;
}

interface produceRequest {
  transportId: string;
  kind: mediasoupTypes.MediaKind;
  rtpParameters: mediasoupTypes.RtpParameters;
  appData: any;
}

interface closeProducerRequest {
  producerId: string;
}

interface Response {
  type: MsgType.Response;
  method: RequestResponseMethod;
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface Notification {
  type: MsgType.Notification;
  method: string;
  data: any;
}

type WebSocketMessage = Request | Response | Notification;

export type {
  createWebRtcTransportRequest,
  connectWebRtcTransportRequest,
  restartIceRequest,
  joinRequest,
  produceRequest,
  closeProducerRequest,
  WebSocketMessage,
  RequestResponseMethod,
  NotificationMethod,
  Method,
  Request,
  Response,
  Notification,
};
export { MsgType };
