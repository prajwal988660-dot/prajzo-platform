import { model, Schema } from 'mongoose';

/**
 * Counters that only ever go up, one document per sequence (for example "projectRequest:2026").
 * Incrementing one is a single atomic database operation, which is what keeps reference numbers
 * unique when two requests arrive at the same moment.
 */
const counterSchema = new Schema<{ _id: string; seq: number }>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

export const CounterModel = model('Counter', counterSchema);
