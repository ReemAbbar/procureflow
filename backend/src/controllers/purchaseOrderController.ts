import { Request, Response } from 'express';
import PurchaseOrder, { PO_STATUSES } from '../models/PurchaseOrder';
import { createPurchaseOrder, HttpError } from '../services/purchaseOrders';
import { handleError } from './handleError';

export const createPO = async (req: Request, res: Response) => {
  try {
    const { requestId, rfqId, vendor, unitPrice } = req.body;
    const po = await createPurchaseOrder({
      requestId,
      rfqId,
      vendor,
      unitPrice: unitPrice != null ? Number(unitPrice) : undefined,
    });
    res.status(201).json(po);
  } catch (err) {
    handleError(res, err, 'Failed to create purchase order');
  }
};

export const getPOs = async (_req: Request, res: Response) => {
  try {
    const pos = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.status(200).json(pos);
  } catch (err) {
    handleError(res, err, 'Failed to fetch purchase orders');
  }
};

export const getPO = async (req: Request, res: Response) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) throw new HttpError(404, 'Purchase order not found');
    res.status(200).json(po);
  } catch (err) {
    handleError(res, err, 'Failed to fetch purchase order');
  }
};

export const updatePOStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!PO_STATUSES.includes(status)) {
      throw new HttpError(400, `Status must be one of: ${PO_STATUSES.join(', ')}`);
    }
    const po = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!po) throw new HttpError(404, 'Purchase order not found');
    res.status(200).json(po);
  } catch (err) {
    handleError(res, err, 'Failed to update purchase order');
  }
};
