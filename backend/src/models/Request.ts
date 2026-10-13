import mongoose, { Schema, Document } from 'mongoose';

export const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Operations', 'Marketing'] as const;

export interface IHistoryEntry {
  action: 'submitted' | 'approved' | 'rejected';
  comment?: string;
  by?: string;
  at: Date;
}

export interface IRequest extends Document {
  itemName: string;
  description: string;
  quantity: number;
  estimatedPrice: number;
  preferredVendor: string;
  department?: (typeof DEPARTMENTS)[number];
  requestedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  history: IHistoryEntry[];
  createdAt: Date;
}

const HistorySchema = new Schema<IHistoryEntry>(
  {
    action: { type: String, enum: ['submitted', 'approved', 'rejected'], required: true },
    comment: { type: String, trim: true },
    // Simulated identity of whoever performed the action.
    by: { type: String, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RequestSchema: Schema = new Schema(
  {
    itemName: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    estimatedPrice: { type: Number, required: true },
    preferredVendor: { type: String, required: true },
    // Optional so requests created before departments existed stay valid.
    department: { type: String, enum: DEPARTMENTS },
    // Simulated requester identity (no real auth yet).
    requestedBy: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    history: { type: [HistorySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IRequest>('Request', RequestSchema);
