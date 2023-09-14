import { WebSocketMessage } from '../types';
import WebSocket from 'ws';

export type Result<T, E> = [T, E];

export const unmarshallJSON = (data: WebSocket.Data): Result<WebSocketMessage | null, unknown> => {
  let result = null;
  try {
    result = JSON.parse(data as string);
  } catch (error) {
    return [null, error];
  }
  return [result, null];
};
