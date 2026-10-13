import mongoose, { Schema, Document, Types } from 'mongoose';

export const PO_STATUSES = ['draft', 'sent', 'acknowledged', 'completed'] as const;
export type POStatus = (typeof PO_STATUSES)[number];

export interface IPOItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  requestId: Types.ObjectId;
  rfqId?: Types.ObjectId;
  vendor: { name: string; email?: string };
  items: IPOItem[];
  totalAmount: number;
  status: POStatus;
  createdAt: Date;
}

const POItemSchema = new Schema<IPOItem>(
  {
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema: Schema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    requestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
    rfqId: { type: Schema.Types.ObjectId, ref: 'RFQ' },
    vendor: {
      name: { type: String, required: true },
      email: { type: String },
    },
    items: { type: [POItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PO_STATUSES, default: 'draft' },
  },
  { timestamps: true }
);

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
