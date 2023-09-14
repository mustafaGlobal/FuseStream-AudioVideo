import { WebSocketMessage } from '../types';
import WebSocket from 'ws';

type Result<T, E> = [T, E];

const unmarshallJSON = (data: WebSocket.Data): Result<WebSocketMessage | null, unknown> => {
  let result = null;
  try {
    result = JSON.parse(data as string);
  } catch (error) {
    return [null, error];
  }
  return [result, null];
};

export { unmarshallJSON, Result };
