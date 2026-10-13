import mongoose, { Schema, Document, Types } from 'mongoose';

export const RFQ_STATUSES = ['draft', 'sent', 'quotes_received', 'awarded'] as const;
export type RFQStatus = (typeof RFQ_STATUSES)[number];

export interface IRFQVendor {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  estimatedPrice?: number; // expected unit price in BD, for reference only (not a quote)
  quotedPrice?: number; // unit price
  deliveryDays?: number;
  notes?: string;
  status: 'pending' | 'quoted' | 'declined';
}

export interface IRFQ extends Document {
  requestId: Types.ObjectId;
  vendors: Types.DocumentArray<IRFQVendor & Document>;
  deadline: Date;
  notes?: string;
  status: RFQStatus;
  awardedVendorId?: Types.ObjectId;
  purchaseOrderId?: Types.ObjectId;
  createdAt: Date;
}

const VendorQuoteSchema = new Schema<IRFQVendor>({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  estimatedPrice: { type: Number, min: 0 },
  quotedPrice: { type: Number, min: 0 },
  deliveryDays: { type: Number, min: 0 },
  notes: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'quoted', 'declined'], default: 'pending' },
});

const RFQSchema: Schema = new Schema(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
    vendors: {
      type: [VendorQuoteSchema],
      validate: {
        validator: (v: unknown[]) => v.length >= 1 && v.length <= 3,
        message: 'An RFQ needs between 1 and 3 vendors',
      },
    },
    deadline: { type: Date, required: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: RFQ_STATUSES, default: 'draft' },
    awardedVendorId: { type: Schema.Types.ObjectId },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  },
  { timestamps: true }
);

export default mongoose.model<IRFQ>('RFQ', RFQSchema);
