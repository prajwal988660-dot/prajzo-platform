import { yearInIndia } from '@prajzo/shared';
import { isDuplicateKeyError } from '../../db/errors';
import { CounterModel } from './counter.model';

async function increment(counterId: string): Promise<number> {
  // Two requests can try to create a year's very first counter at the same moment. The database
  // refuses one of them with a duplicate-key error; trying again simply increments the counter
  // that now exists.
  for (let attempt = 1; ; attempt += 1) {
    try {
      const counter = await CounterModel.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' },
      );
      if (!counter) throw new Error(`The counter ${counterId} could not be updated`);
      return counter.seq;
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt >= 5) throw error;
    }
  }
}

/**
 * The next project reference number, such as PRZ-2026-0001. The number restarts each year
 * (India time). Numbers are never reused, so a request that fails after its number was taken
 * leaves a gap, which is harmless.
 */
export async function nextProjectReference(now: Date = new Date()): Promise<string> {
  const year = yearInIndia(now);
  const sequence = await increment(`projectRequest:${year}`);
  return `PRZ-${year}-${String(sequence).padStart(4, '0')}`;
}
