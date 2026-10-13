import { Types } from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder';
import RequestModel from '../models/Request';
import { nextSequence } from '../models/Counter';
import { notify } from './notify';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type CreatePOInput = {
  requestId: string | Types.ObjectId;
  rfqId?: string | Types.ObjectId;
  vendor: { name: string; email?: string };
  // Defaults to the request's estimated price when no quote was awarded.
  unitPrice?: number;
};

async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`po-${year}`);
  return `PO-${year}-${String(seq).padStart(3, '0')}`;
}

export async function createPurchaseOrder({ requestId, rfqId, vendor, unitPrice }: CreatePOInput) {
  const request = await RequestModel.findById(requestId);
  if (!request) throw new HttpError(404, 'Request not found');
  if (request.status !== 'approved') {
    throw new HttpError(400, 'Purchase orders can only be created for approved requests');
  }
  if (!vendor?.name?.trim()) throw new HttpError(400, 'Vendor name is required');

  const price = unitPrice ?? request.estimatedPrice;
  const totalPrice = price * request.quantity;

  const po = await PurchaseOrder.create({
    poNumber: await generatePoNumber(),
    requestId: request._id,
    rfqId,
    vendor: { name: vendor.name.trim(), email: vendor.email?.trim() || undefined },
    items: [
      {
        itemName: request.itemName,
        quantity: request.quantity,
        unitPrice: price,
        totalPrice,
      },
    ],
    totalAmount: totalPrice,
  });

  await notify(`Purchase Order ${po.poNumber} created`, 'success', `/purchase-orders/${po._id}`);
  return po;
}
