import { Response } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../services/purchaseOrders';

export function handleError(res: Response, err: unknown, fallback: string) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ error: fallback });
}
