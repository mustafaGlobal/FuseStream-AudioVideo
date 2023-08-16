import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';

import { config } from '../config';

const worker: Array<{
  worker: mediasoupTypes.Worker;
  router: mediasoupTypes.Router;
}> = [];

let nextMediasoupWorkerIdx = 0;

const createMediasoupRouter = async (): Promise<mediasoupTypes.Router> => {
  const worker = await mediasoup.createWorker({
    logLevel: config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
  });

  worker.on('died', (error) => {
    console.error('mediasoup worker died!: %o', error);
    process.exit(1);
  });

  const mediaCodecs = config.mediasoup.router.mediaCodecs;
  const mediasoupRouter = await worker.createRouter({
    mediaCodecs: mediaCodecs,
  });

  return mediasoupRouter;
};

export { createMediasoupRouter };
