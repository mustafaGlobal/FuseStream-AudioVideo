import { EventEmitter } from 'events';
import { createLogger } from '../../logger';

const logger = createLogger('safe-event-emmiter');

class SafeEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
  }

  safeEmit(event: string | symbol, ...args: any[]): void {
    try {
      this.emit(event, ...args);
    } catch (error) {
      logger.error('safeEmit() | event listener threw an error [event:%s]:%o', event, error);
    }
  }
}

export default SafeEventEmitter;
