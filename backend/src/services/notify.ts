import Notification, { INotification } from '../models/Notification';

// Notifications are a side effect: a failure here must never fail the main operation.
export async function notify(
  message: string,
  type: INotification['type'] = 'info',
  link?: string
): Promise<void> {
  try {
    await Notification.create({ message, type, link });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
