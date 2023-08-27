import os from 'os';
import { types as mediasoupTypes } from 'mediasoup';

export const config = {
  listenIp: '0.0.0.0',
  listenPort: 3016,
  mediasoup: {
    numWorkers: Object.keys(os.cpus()).length,
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'debug',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
      ] as mediasoupTypes.WorkerLogTag[],
    },
    router: {
      mediaCodecs: [
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ] as mediasoupTypes.RtpCodecCapability[],
    },
    webRtcTransport: {
      listenIps: [
        { ip: '0.0.0.0', announcedIp: '127.0.0.1' },
      ] as mediasoupTypes.TransportListenIp[],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
    },
  },
} as const;
