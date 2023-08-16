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
import { WorkerPool } from './lib/workerPool';
import { config } from './config';
import { ConferenceRoom } from './lib/conferenceRoom';
import { Worker } from 'mediasoup/node/lib/types';

const logger = createLogger('main');

let Conferences: Map<String, ConferenceRoom> = new Map();

const main = async () => {
  const app = express();
  app.use(cors());
  const httpServer = http.createServer(app);
  const wsServer = new WebSocketServer(httpServer);

  const Workers: WorkerPool = await WorkerPool.create(
    config.mediasoup.numWorkers
  );

  // Create a hardcoded room for testing
  let testConference = await ConferenceRoom.create(Workers.getWorker(), 'test');
  Conferences.set('test', testConference);

  wsServer.on('connection', (event) => {
    const { requestUrl, transport } = event;
    const u = url.parse(requestUrl, true);
    const roomId = u.query.roomId;
    const peerId = u.query.peerId;
    if (typeof roomId == 'string' && typeof peerId == 'string') {
      const conference = Conferences.get(roomId);
      if (conference) {
        if (conference.getRoom().hasPeer(peerId)) {
          transport.close();
        } else {
          console.log('Peer joined');
          conference.getRoom().addPeer(peerId, transport);
          let peer = conference.getRoom().getPeer(peerId);
          peer?.addListener('request', (request, resovle, reject) => {
            resovle({ succes: true });
          });
        }
      } else {
        transport.close();
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
