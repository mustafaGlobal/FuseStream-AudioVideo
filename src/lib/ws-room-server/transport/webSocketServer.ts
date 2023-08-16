import { createLogger } from '../../logger';
import http from 'http';
import WebSocket, { Server } from 'ws';
import { WebSocketTransport } from './webSocketTransport';
import SafeEventEmitter from '../utils/safeEventEmitter';

const logger = createLogger('transport:web-socket-server');

class WebSocketServer extends SafeEventEmitter {
  private wsServer: Server;

  constructor(httpServer: http.Server) {
    super();

    this.wsServer = new Server({ server: httpServer, path: '/ws' });

    this.wsServer.on('connection', (socket, request) => {
      this.handleConnection(socket, request);
    });
  }

  public stop() {
    logger.debug('stop()');
    this.wsServer.close();
  }

  private handleConnection(socket: WebSocket, request: http.IncomingMessage) {
    // If there are no listeners, reject the request.
    if (this.listenerCount('connection') === 0) {
      return;
    }

    const transport = new WebSocketTransport(socket);

    this.safeEmit('connection', {
      requestUrl: request.url,
      transport: transport,
    });

    // Add more event listeners as needed for your application
  }
}

export { WebSocketServer };
