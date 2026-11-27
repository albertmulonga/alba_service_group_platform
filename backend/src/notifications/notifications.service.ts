import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

type Channel = 'IN_APP' | 'EMAIL' | 'WHATSAPP';

export interface BusinessNotification {
  eventType: string;
  eventId: string;
  title: string;
  content: string;
  module: string;
  link?: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  payload?: Record<string, unknown>;
}

class ChannelNotConfiguredError extends Error {}

const CHANNELS: Channel[] = ['IN_APP', 'EMAIL', 'WHATSAPP'];
const MAX_ERROR_LENGTH = 500;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private worker?: NodeJS.Timeout;
  private processing = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.NODE_ENV !== 'test' && process.env.NOTIFICATIONS_WORKER_ENABLED !== 'false') {
      this.worker = setInterval(() => void this.processPending(), 10_000);
      this.worker.unref();
      void this.processPending();
    }
  }

  onModuleDestroy() {
    if (this.worker) clearInterval(this.worker);
  }

  async notifyUsers(userIds: string[], event: BusinessNotification): Promise<void> {
    const prisma = this.prisma as any;
    const users = await prisma.user.findMany({
      where: { id: { in: [...new Set(userIds)] }, status: 'ACTIVE' },
      select: { id: true, email: true, phone: true },
    });

    await Promise.all(users.map((user: any) => this.enqueueForRecipient(event, {
      userId: user.id,
      email: user.email,
      phone: user.phone,
    })));
  }

  async notifyEmployees(
    event: BusinessNotification,
    roleSlugs: string[] = ['super-admin', 'admin'],
    permissionSlugs: string[] = [],
  ): Promise<void> {
    const prisma = this.prisma as any;
    const roleFilter = roleSlugs.length
      ? [{ roles: { some: { role: { slug: { in: roleSlugs } } } } }]
      : [];
    const permissionFilter = permissionSlugs.length
      ? [{ permissions: { some: { permission: { slug: { in: permissionSlugs } } } } }]
      : [];

    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        customerProfile: null,
        OR: [...roleFilter, ...permissionFilter],
      },
      select: { id: true, email: true, phone: true },
    });

    await Promise.all(users.map((user: any) => this.enqueueForRecipient(event, {
      userId: user.id,
      email: user.email,
      phone: user.phone,
    })));
  }

  async notifyCustomer(customerId: string, event: BusinessNotification): Promise<void> {
    const prisma = this.prisma as any;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { email: true, phone: true, whatsapp: true, userId: true },
    });
    if (!customer) return;
    await this.enqueueForRecipient(event, {
      userId: customer.userId,
      email: customer.email,
      phone: customer.whatsapp || customer.phone,
    });
  }

  async listUserNotifications(userId: string) {
    const prisma = this.prisma as any;
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const prisma = this.prisma as any;
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const prisma = this.prisma as any;
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteNotification(userId: string, notificationId: string) {
    const prisma = this.prisma as any;
    return prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  async deleteAllNotifications(userId: string) {
    const prisma = this.prisma as any;
    return prisma.notification.deleteMany({ where: { userId } });
  }

  async listDeliveries(userId: string, filters: { status?: string; channel?: Channel; search?: string }) {
    await this.assertAdministrator(userId);
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.channel) where.channel = filters.channel;
    if (filters.search) {
      where.OR = [
        { recipient: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { eventType: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.notificationDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        eventType: true,
        eventId: true,
        channel: true,
        recipient: true,
        title: true,
        status: true,
        attempts: true,
        nextAttemptAt: true,
        sentAt: true,
        lastError: true,
        createdAt: true,
      },
    });
  }

  async retryDelivery(userId: string, deliveryId: string) {
    await this.assertAdministrator(userId);
    const prisma = this.prisma as any;
    const delivery = await prisma.notificationDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) return null;
    if (delivery.status !== 'FAILED') {
      return delivery;
    }
    const retried = await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', attempts: 0, lastError: null, nextAttemptAt: new Date() },
    });
    void this.processPending();
    return retried;
  }

  private async enqueueForRecipient(
    event: BusinessNotification,
    recipient: { userId?: string | null; email?: string | null; phone?: string | null },
  ) {
    const prisma = this.prisma as any;
    const targets: { channel: Channel; recipient: string }[] = [];
    if (recipient.userId) targets.push({ channel: 'IN_APP', recipient: recipient.userId });
    if (recipient.email) targets.push({ channel: 'EMAIL', recipient: recipient.email });
    if (recipient.phone) targets.push({ channel: 'WHATSAPP', recipient: recipient.phone });

    for (const target of targets) {
      if (recipient.userId) {
        const preference = await prisma.notificationPreference.findUnique({
          where: {
            userId_channel_eventType: {
              userId: recipient.userId,
              channel: target.channel,
              eventType: event.eventType,
            },
          },
          select: { enabled: true },
        });
        if (preference && !preference.enabled) continue;
      }

      try {
        await prisma.notificationDelivery.create({
          data: {
            eventType: event.eventType,
            eventId: event.eventId,
            channel: target.channel,
            recipient: target.recipient,
            title: event.title,
            content: event.content,
            payload: event.payload,
          },
        });
      } catch (error) {
        if ((error as any)?.code !== 'P2002') throw error;
      }
    }
  }

  private async assertAdministrator(userId: string) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: { select: { role: { select: { slug: true } } } },
        permissions: { select: { permission: { select: { slug: true } } } },
      },
    });
    const isAdmin = user?.roles?.some((entry: any) =>
      ['super-admin', 'admin'].includes(entry.role.slug),
    );
    const hasPermission = user?.permissions?.some((entry: any) =>
      ['notifications.view', 'notifications.manage'].includes(entry.permission.slug),
    );
    if (!isAdmin && !hasPermission) throw new ForbiddenException('Accès réservé aux administrateurs.');
  }

  private async processPending() {
    if (this.processing) return;
    this.processing = true;
    try {
      const prisma = this.prisma as any;
      const deliveries = await prisma.notificationDelivery.findMany({
        where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      for (const delivery of deliveries) {
        const claim = await prisma.notificationDelivery.updateMany({
          where: { id: delivery.id, status: 'PENDING' },
          data: { status: 'PROCESSING' },
        });
        if (!claim.count) continue;

        try {
          await this.deliver(delivery);
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: { status: 'SENT', sentAt: new Date(), lastError: null },
          });
        } catch (error) {
          const notConfigured = error instanceof ChannelNotConfiguredError;
          const attempts = delivery.attempts + (notConfigured ? 0 : 1);
          const status = attempts >= delivery.maxAttempts ? 'FAILED' : 'PENDING';
          const delayMinutes = notConfigured ? 30 : Math.min(60, 2 ** attempts);
          const message = error instanceof Error ? error.message : 'Erreur inconnue du fournisseur';
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status,
              attempts,
              nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
              lastError: message.slice(0, MAX_ERROR_LENGTH),
            },
          });
          this.logger.warn(`Notification delivery ${delivery.id} failed (${delivery.channel}).`);
        }
      }
    } catch (error) {
      this.logger.error('Notification queue processing failed.', error instanceof Error ? error.stack : undefined);
    } finally {
      this.processing = false;
    }
  }

  private async deliver(delivery: any) {
    if (delivery.channel === 'IN_APP') {
      const prisma = this.prisma as any;
      await prisma.notification.create({
        data: {
          userId: delivery.recipient,
          title: delivery.title,
          message: delivery.content,
          type: 'info',
          module: delivery.eventType,
        },
      });
      return;
    }
    if (delivery.channel === 'EMAIL') return this.sendEmail(delivery);
    if (delivery.channel === 'WHATSAPP') return this.sendWhatsApp(delivery);
    throw new Error(`Unsupported notification channel: ${delivery.channel}`);
  }

  private async sendEmail(delivery: any) {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!host || !from) throw new ChannelNotConfiguredError('SMTP is not configured.');

    const port = Number(process.env.SMTP_PORT || 587);
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' }
        : undefined,
    });
    await transport.sendMail({
      from,
      to: delivery.recipient,
      subject: delivery.title,
      text: delivery.content,
      html: `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:auto"><header style="background:#102a5e;color:white;padding:24px"><strong>ALBA SERVICE GROUP</strong></header><main style="padding:24px"><h1 style="color:#102a5e;font-size:22px">${escapeHtml(delivery.title)}</h1><p style="line-height:1.6">${escapeHtml(delivery.content).replace(/\n/g, '<br>')}</p></main><footer style="background:#f8fafc;padding:16px;color:#64748b;font-size:12px">Communication automatique — ALBA SERVICE GROUP</footer></div>`,
    });
  }

  private async sendWhatsApp(delivery: any) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) throw new ChannelNotConfiguredError('WhatsApp Business API is not configured.');

    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: delivery.recipient,
        type: 'text',
        text: { body: `${delivery.title}\n\n${delivery.content}` },
      }),
    });
    if (!response.ok) {
      throw new Error(`WhatsApp provider returned HTTP ${response.status}.`);
    }
  }
}
