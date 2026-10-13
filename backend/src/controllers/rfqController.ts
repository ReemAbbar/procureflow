import { Request, Response } from 'express';
import RFQ from '../models/RFQ';
import RequestModel from '../models/Request';
import { notify } from '../services/notify';
import { createPurchaseOrder, HttpError } from '../services/purchaseOrders';
import { handleError } from './handleError';

const populateRequest = { path: 'requestId' };

type VendorInput = { name?: string; email?: string; estimatedPrice?: number | string | null };
type QuoteInput = {
  _id: string;
  quotedPrice?: number | null;
  deliveryDays?: number | null;
  notes?: string;
  status?: 'pending' | 'quoted' | 'declined';
};

export const createRFQ = async (req: Request, res: Response) => {
  try {
    const { requestId, vendors, deadline, notes, status } = req.body;

    const request = await RequestModel.findById(requestId);
    if (!request) throw new HttpError(404, 'Request not found');
    if (request.status !== 'approved') {
      throw new HttpError(400, 'RFQs can only be created for approved requests');
    }
    if (await RFQ.exists({ requestId })) {
      throw new HttpError(409, 'An RFQ already exists for this request');
    }

    const cleanVendors = (Array.isArray(vendors) ? (vendors as VendorInput[]) : [])
      .map((v) => {
        const est = Number(v.estimatedPrice);
        return {
          name: v.name?.trim(),
          email: v.email?.trim() || undefined,
          // Optional reference estimate; ignore blanks and junk rather than failing the RFQ.
          estimatedPrice: v.estimatedPrice != null && v.estimatedPrice !== '' && est >= 0 ? est : undefined,
        };
      })
      .filter((v) => v.name);

    const rfq = await RFQ.create({
      requestId,
      vendors: cleanVendors,
      deadline,
      notes,
      status: status === 'sent' ? 'sent' : 'draft',
    });

    if (rfq.status === 'sent') {
      await notify(`RFQ sent for ${request.itemName}`, 'info', `/rfq/${rfq._id}`);
    }

    res.status(201).json(await rfq.populate(populateRequest));
  } catch (err) {
    handleError(res, err, 'Failed to create RFQ');
  }
};

export const getRFQs = async (_req: Request, res: Response) => {
  try {
    const rfqs = await RFQ.find().populate(populateRequest).sort({ createdAt: -1 });
    res.status(200).json(rfqs);
  } catch (err) {
    handleError(res, err, 'Failed to fetch RFQs');
  }
};

export const getRFQ = async (req: Request, res: Response) => {
  try {
    const rfq = await RFQ.findById(req.params.id).populate(populateRequest);
    if (!rfq) throw new HttpError(404, 'RFQ not found');
    res.status(200).json(rfq);
  } catch (err) {
    handleError(res, err, 'Failed to fetch RFQ');
  }
};

// Handles three kinds of update: sending a draft, recording vendor quotes, and awarding.
export const updateRFQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, vendors, awardedVendorId } = req.body as {
      status?: string;
      vendors?: QuoteInput[];
      awardedVendorId?: string;
    };

    const rfq = await RFQ.findById(id);
    if (!rfq) throw new HttpError(404, 'RFQ not found');
    if (rfq.status === 'awarded') throw new HttpError(409, 'This RFQ has already been awarded');

    if (status === 'awarded') {
      const winner = rfq.vendors.id(awardedVendorId);
      if (!winner) throw new HttpError(400, 'Choose a vendor to award');
      if (winner.status !== 'quoted' || winner.quotedPrice == null) {
        throw new HttpError(400, 'Only vendors with a submitted quote can be awarded');
      }

      // Atomically claim the award so a double-click can't create two purchase orders.
      const claimed = await RFQ.findOneAndUpdate(
        { _id: id, status: { $ne: 'awarded' } },
        { status: 'awarded', awardedVendorId: winner._id },
        { new: true }
      );
      if (!claimed) throw new HttpError(409, 'This RFQ has already been awarded');

      let po;
      try {
        po = await createPurchaseOrder({
          requestId: rfq.requestId,
          rfqId: rfq._id,
          vendor: { name: winner.name, email: winner.email },
          unitPrice: winner.quotedPrice,
        });
      } catch (err) {
        // Roll back the award so it can be retried.
        await RFQ.updateOne({ _id: id }, { status: rfq.status, $unset: { awardedVendorId: 1 } });
        throw err;
      }
      claimed.purchaseOrderId = po._id;
      await claimed.save();
      return res.status(200).json(await claimed.populate(populateRequest));
    }

    const wasDraft = rfq.status === 'draft';
    if (status === 'sent' && wasDraft) rfq.status = 'sent';

    if (Array.isArray(vendors)) {
      if (rfq.status === 'draft') throw new HttpError(400, 'Send the RFQ before recording quotes');
      for (const q of vendors) {
        const vendor = rfq.vendors.id(q._id);
        if (!vendor) continue;
        vendor.quotedPrice = q.quotedPrice ?? undefined;
        vendor.deliveryDays = q.deliveryDays ?? undefined;
        vendor.notes = q.notes?.trim() || undefined;
        vendor.status = q.status ?? (q.quotedPrice != null ? 'quoted' : 'pending');
      }
      const anyQuoted = rfq.vendors.some((v) => v.status === 'quoted');
      rfq.status = anyQuoted ? 'quotes_received' : 'sent';
    }

    await rfq.save();

    if (wasDraft && rfq.status !== 'draft') {
      const request = await RequestModel.findById(rfq.requestId);
      await notify(`RFQ sent for ${request?.itemName ?? 'a request'}`, 'info', `/rfq/${rfq._id}`);
    }

    res.status(200).json(await rfq.populate(populateRequest));
  } catch (err) {
    handleError(res, err, 'Failed to update RFQ');
  }
};
