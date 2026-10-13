import { Request, Response } from 'express';
import RequestModel from '../models/Request';
import { notify } from '../services/notify';

export const createRequest = async (req: Request, res: Response) => {
  try {
    // History and status are server-controlled; ignore any client-supplied values.
    const { history, status, ...fields } = req.body;
    const newRequest = new RequestModel({
      ...fields,
      history: [{ action: 'submitted', by: fields.requestedBy, at: new Date() }],
    });
    const saved = await newRequest.save();
    const from = saved.department ? ` from ${saved.department}` : '';
    await notify(`New purchase request: ${saved.itemName}${from}`, 'info', '/requests');
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create request', details: err });
  }
};

export const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await RequestModel.find().sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

export const updateRequestStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment, decidedBy } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
    }
    const note = typeof comment === 'string' ? comment.trim() : '';
    const by = typeof decidedBy === 'string' ? decidedBy.trim() : '';
    const existing = await RequestModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }
    // Separation of duties: nobody decides on a request they submitted.
    // (Identities are simulated, so this mirrors the UI rule rather than securing it.)
    if (by && existing.requestedBy && by === existing.requestedBy) {
      return res.status(403).json({ error: 'You cannot approve your own request' });
    }
    const updated = await RequestModel.findByIdAndUpdate(
      id,
      {
        status,
        $push: { history: { action: status, comment: note || undefined, by: by || undefined, at: new Date() } },
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (status === 'approved') {
      await notify(`${updated.itemName} request has been approved`, 'success', '/requests');
    } else {
      const reason = note ? `: ${note}` : '';
      await notify(`${updated.itemName} request was rejected${reason}`, 'warning', '/requests');
    }
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update status' });
  }
};