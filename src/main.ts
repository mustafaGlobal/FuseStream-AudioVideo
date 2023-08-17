import express from 'express';
import cors from 'cors';
import http from 'http';
import url from 'node:url';

import { createLogger } from './lib/logger';

import {
  WebSocketServer,
  Room,
  Message,
  WebSocketTransport,
} from './lib/ws-room-server';
import { config } from './config';
import { ConferenceMenager } from './lib/conferenceMenager';

const logger = createLogger('main');

const main = async () => {
  const app = express();
  app.use(cors());
  const httpServer = http.createServer(app);
  const wsServer = new WebSocketServer(httpServer);
  const conferences = await ConferenceMenager.create(
    config.mediasoup.numWorkers
  );

  wsServer.on('connection', async (event) => {
    const { requestUrl, transport } = event;
    const u = url.parse(requestUrl, true);
    const roomId = u.query.roomId;
    const peerId = u.query.peerId;
    if (typeof roomId == 'string' && typeof peerId == 'string') {
      const conference = await conferences.createOrGetConference(roomId);

      if (conference) {
        if (conference.getPeer(peerId)) {
          transport.close();
        } else {
          logger.debug('joined in conference %o', conference);
          // conference.addPeer(peerId, transport);
          // let peer = conference.getRoom().getPeer(peerId);
          // peer?.addListener('request', (request, resovle, reject) => {
          //   resovle({ succes: true });
          // });
        }
      }
    } else {
      transport.close();
    }
  });

  const port = 8000;
  httpServer.listen(port, () => {
    logger.info(`Audio/Video conference server listening on port:${port}`);
  });
};

export { main };
