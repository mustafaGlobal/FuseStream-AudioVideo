import { ConferenceRoom } from './conferenceRoom';
import { WorkerPool } from '../workers/workerPool';

interface ConferenceMenagerConstructor {
  workers: WorkerPool;
}

class ConferenceManager {
  private workers: WorkerPool;
  private conferences: Map<string, ConferenceRoom>;

  static async create(numWorkers: number) {
    const workers: WorkerPool = await WorkerPool.create(numWorkers);

    return new ConferenceManager({ workers });
  }

  constructor({ workers }: ConferenceMenagerConstructor) {
    this.workers = workers;
    this.conferences = new Map();
  }

  public hasConference(id: string): boolean {
    return this.conferences.has(id);
  }

  public getConference(id: string): ConferenceRoom | undefined {
    return this.conferences.get(id);
  }

  public removeConference(id: string) {
    if (!this.conferences.has(id)) {
      return;
    }
    const conference = this.getConference(id);
    conference?.close();
    this.conferences.delete(id);
  }

  public async createOrGetConference(id: string): Promise<ConferenceRoom> {
    if (this.hasConference(id)) {
      const conference = this.getConference(id);
      if (conference) {
        return conference;
      }
    }

    const worker = this.workers.getWorker();
    const conference = await ConferenceRoom.create(worker, id);

    if (!conference) {
      throw new Error('Failed to create conference.');
    }

    this.conferences.set(id, conference);
    return conference;
  }
}

export { ConferenceManager };
