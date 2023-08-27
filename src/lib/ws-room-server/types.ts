type RequestResponseMethod =
  | 'join'
  | 'getRouterRtpCapabilities'
  | 'createWebRtcTransport';

type NotificationMethod = 'peerClosed' | 'newPeer';

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

interface createWebRtcTransportReq {
  forceTcp: boolean;
  producing: boolean;
  consuming: boolean;
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
  createWebRtcTransportReq,
  WebSocketMessage,
  RequestResponseMethod,
  NotificationMethod,
  Method,
  Request,
  Response,
  Notification,
};
export { MsgType };
