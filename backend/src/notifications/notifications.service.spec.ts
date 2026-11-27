import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('deletes only the notification owned by the requesting user', async () => {
    const notification = { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const prisma = { notification };
    const service = new NotificationsService(prisma as never);

    await service.deleteNotification('user-1', 'notification-1');

    expect(notification.deleteMany).toHaveBeenCalledWith({
      where: { id: 'notification-1', userId: 'user-1' },
    });
  });
});
