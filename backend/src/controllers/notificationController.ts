import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { handleError } from './handleError';

export const getNotifications = async (_req: Request, res: Response) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json(notifications);
  } catch (err) {
    handleError(res, err, 'Failed to fetch notifications');
  }
};

export const markAllRead = async (_req: Request, res: Response) => {
  try {
    const result = await Notification.updateMany({ read: false }, { read: true });
    res.status(200).json({ updated: result.modifiedCount });
  } catch (err) {
    handleError(res, err, 'Failed to mark notifications as read');
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const n = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!n) return res.status(404).json({ error: 'Notification not found' });
    res.status(200).json(n);
  } catch (err) {
    handleError(res, err, 'Failed to mark notification as read');
  }
};
