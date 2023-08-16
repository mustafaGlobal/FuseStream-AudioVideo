import express from 'express';
import cors from 'cors';
import http from 'http';
import url from 'node:url';

import {
  WebSocketServer,
  Room,
  Message,
  WebSocketTransport,
} from './lib/ws-room-server';

let Rooms: Map<String, Room> = new Map();

const main = async () => {
  const app = express();
  app.use(cors());
  const httpServer = http.createServer(app);
  const wsServer = new WebSocketServer(httpServer);

  // Create a hardcoded room for testing
  const room = new Room('test');
  Rooms.set(room.getRoomId(), room);

  wsServer.on('connection', (event) => {
    const { requestUrl, transport } = event;
    const u = url.parse(requestUrl, true);
    const roomId = u.query.roomId;
    const peerId = u.query.peerId;
    if (typeof roomId == 'string' && typeof peerId == 'string') {
      const room = Rooms.get(roomId);
      if (room) {
        if (room.hasPeer(peerId)) {
          console.log('Peer already joined');
          transport.close();
        } else {
          console.log('Peer joined');
          room.addPeer(peerId, transport);
          let peer = room.getPeer(peerId);
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
    console.log(`Audio/Video conference server listening on port:${port}`);
  });
};

export { main };
