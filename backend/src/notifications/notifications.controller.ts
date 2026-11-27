import { Controller, Delete, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listMine(@CurrentUser('id') userId: string) {
    return this.notificationsService.listUserNotifications(userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Delete()
  deleteAll(@CurrentUser('id') userId: string) {
    return this.notificationsService.deleteAllNotifications(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Delete(':id')
  deleteOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(userId, id);
  }

  @Get('deliveries')
  listDeliveries(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('channel') channel?: 'IN_APP' | 'EMAIL' | 'WHATSAPP',
    @Query('search') search?: string,
  ) {
    return this.notificationsService.listDeliveries(userId, { status, channel, search });
  }

  @Post('deliveries/:id/retry')
  retryDelivery(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.retryDelivery(userId, id);
  }
}
