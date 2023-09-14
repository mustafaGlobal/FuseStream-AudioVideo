import { types as mediasoupTypes } from 'mediasoup';

interface Device {
  flag: string;
  name: string;
  version: string;
}

interface PeerInfo {
  id: string;
  displayName: string;
  device: Device | null;
}

type RequestResponseMethod =
  | 'getRouterRtpCapabilities'
  | 'createWebRtcTransport'
  | 'connectWebRtcTransport'
  | 'restartIce'
  | 'join'
  | 'newConsumer'
  | 'produce'
  | 'closeProducer'
  | 'pauseProducer'
  | 'resumeProducer'
  | 'pauseConsumer'
  | 'resumeConsumer'
  | 'setConsumerPreferredLayers'
  | 'setConsumerPriority'
  | 'requestConsumerKeyFrame';

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

interface CreateWebRtcTransportRequest {
  forceTcp: boolean;
  producing: boolean;
  consuming: boolean;
}

interface ConnectWebRtcTransportRequest {
  transportId: string;
  dtlsParameters: mediasoupTypes.DtlsParameters;
}

interface RestartIceRequest {
  transportId: string;
}

interface JoinRequest {
  displayName: string;
  device: Device;
  rtpCapabilites: mediasoupTypes.RtpCapabilities;
}

interface ProduceRequest {
  transportId: string;
  kind: mediasoupTypes.MediaKind;
  rtpParameters: mediasoupTypes.RtpParameters;
  appData: mediasoupTypes.AppData;
}

interface NewConsumerRequest {
  peerId: string;
  producerId: string;
  id: string;
  kind: mediasoupTypes.MediaKind;
  rtpParameters: mediasoupTypes.RtpParameters;
  type: 'simple' | 'simulcast' | 'svc' | 'pipe';
  appData: mediasoupTypes.AppData;
  producerPaused: boolean;
}

interface CloseProducerRequest {
  producerId: string;
}

interface PauseProducerRequest {
  producerId: string;
}

interface ResumeProducerRequest {
  producerId: string;
}

interface PauseConsumerRequest {
  consumerId: string;
}

interface ResumeConsumerRequest {
  consumerId: string;
}

interface SetConsumerPreferredLayersRequest {
  consumerId: string;
  spatialLayer: number;
  temporalLayer: number | undefined;
}

interface SetConsumerPriorityRequest {
  consumerId: string;
  priority: number;
}

interface RequestConsumerKeyFrameRequest {
  consumerId: string;
}

type RequestData =
  | CreateWebRtcTransportRequest
  | ConnectWebRtcTransportRequest
  | RestartIceRequest
  | JoinRequest
  | ProduceRequest
  | NewConsumerRequest
  | CloseProducerRequest
  | PauseProducerRequest
  | ResumeProducerRequest
  | PauseConsumerRequest
  | ResumeConsumerRequest
  | SetConsumerPreferredLayersRequest
  | SetConsumerPriorityRequest
  | RequestConsumerKeyFrameRequest;

interface GetRouterRtpCapabilitiesResponse {
  codecs?: mediasoupTypes.RtpCodecCapability[];
  headerExtension?: mediasoupTypes.RtpHeaderExtension[];
}

interface CreateWebRtcTransportResponse {
  id: string;
  iceParameters: mediasoupTypes.IceParameters;
  iceCandidates: mediasoupTypes.IceCandidate[];
  dtlsParamters: mediasoupTypes.DtlsParameters;
}

interface RestartIceResponse {
  iceParameters: mediasoupTypes.IceParameters;
}

interface JoinResponse {
  peers: PeerInfo[];
}

interface ProduceResponse {
  producerId: string;
}

type ResponseData =
  | GetRouterRtpCapabilitiesResponse
  | CreateWebRtcTransportResponse
  | RestartIceResponse
  | JoinResponse
  | ProduceResponse;

interface NewPeerNotification {
  id: string;
  displayName: string;
  device: Device;
}

interface PeerClosedNotification {
  peerId: string;
}

interface ConsumerClosedNotification {
  peerId: string;
  consumerId: string;
}

interface ConsumerPausedNotification {
  peerId: string;
  consumerId: string;
}

interface ConsumerResumedNotification {
  peerId: string;
  consumerId: string;
}

interface ConsumerLayersChangedNotification {
  peerId: string;
  consumerId: string;
  spatialLayer?: number | null;
  temporalLayer?: number | null;
}

type NotificationData =
  | NewPeerNotification
  | PeerClosedNotification
  | ConsumerClosedNotification
  | ConsumerPausedNotification
  | ConsumerResumedNotification
  | ConsumerLayersChangedNotification
  | Record<string, never>;

interface Request {
  type: MsgType.Request;
  method: RequestResponseMethod;
  id: string;
  data: RequestData;
}

interface Response {
  type: MsgType.Response;
  method: RequestResponseMethod;
  id: string;
  success: boolean;
  data?: ResponseData;
  error?: string;
}

interface Notification {
  type: MsgType.Notification;
  method: Method;
  data: NotificationData;
}

type WebSocketMessage = Request | Response | Notification;

export type {
  GetRouterRtpCapabilitiesResponse,
  CreateWebRtcTransportRequest,
  CreateWebRtcTransportResponse,
  ConnectWebRtcTransportRequest,
  RestartIceRequest,
  RestartIceResponse,
  JoinRequest,
  JoinResponse,
  ProduceRequest,
  ProduceResponse,
  CloseProducerRequest,
  PauseProducerRequest,
  ResumeProducerRequest,
  NewConsumerRequest,
  PauseConsumerRequest,
  ResumeConsumerRequest,
  SetConsumerPreferredLayersRequest,
  SetConsumerPriorityRequest,
  RequestConsumerKeyFrameRequest,
  WebSocketMessage,
  RequestResponseMethod,
  NotificationMethod,
  Method,
  Request,
  Response,
  Notification,
  NewPeerNotification,
  PeerClosedNotification,
  ConsumerClosedNotification,
  ConsumerPausedNotification,
  ConsumerResumedNotification,
  ConsumerLayersChangedNotification,
  NotificationData,
  RequestData,
  ResponseData,
  PeerInfo,
};
export { MsgType };
