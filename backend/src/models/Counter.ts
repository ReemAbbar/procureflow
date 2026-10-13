import mongoose, { Schema } from 'mongoose';

// Atomic sequence counters, e.g. { _id: 'po-2026', seq: 7 } for PO-2026-007.
const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', CounterSchema);

export async function nextSequence(key: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter!.seq as number;
}

export default Counter;
