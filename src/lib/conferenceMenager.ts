import { ConferenceRoom } from './conferenceRoom';
import { WorkerPool } from './workerPool';

interface ConferenceMenagerConstructor {
  workers: WorkerPool;
}

class ConferenceMenager {
  private workers: WorkerPool;
  private conferences: Map<string, ConferenceRoom>;

  static async create(numWorkers: number) {
    const workers: WorkerPool = await WorkerPool.create(numWorkers);

    return new ConferenceMenager({ workers });
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
    if (this.conferences.has(id)) {
      const conference = this.getConference(id);
      conference?.close();
      this.conferences.delete(id);
    }
  }

  public async createOrGetConference(
    id: string
  ): Promise<ConferenceRoom | undefined> {
    if (this.hasConference(id)) {
      return this.getConference(id);
    } else {
      const worker = this.workers.getWorker();
      const conference = await ConferenceRoom.create(worker, id);
      return conference;
    }
  }
}

export { ConferenceMenager };
