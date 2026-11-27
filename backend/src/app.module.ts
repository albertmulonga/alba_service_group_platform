import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PurchasesModule } from './purchases/purchases.module';
import { StockModule } from './stock/stock.module';
import { FinanceModule } from './finance/finance.module';
import { HrModule } from './hr/hr.module';
import { ProjectsModule } from './projects/projects.module';
import { PrintingModule } from './printing/printing.module';
import { CustomersModule } from './customers/customers.module';
import { CommercialModule } from './commercial/commercial.module';
import { DocumentsModule } from './documents/documents.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { SecretariatModule } from './secretariat/secretariat.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { TrainingModule } from './training/training.module';
import { ReportsModule } from './reports/reports.module';
import { AgendaModule } from './agenda/agenda.module';
import { GraphicsModule } from './graphics/graphics.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
    }]),
    PrismaModule,
    AuthModule,
    PurchasesModule,
    StockModule,
    FinanceModule,
    HrModule,
    ProjectsModule,
    PrintingModule,
    CustomersModule,
    CommercialModule,
    DocumentsModule,
    SettingsModule,
    UsersModule,
    DepartmentsModule,
    SecretariatModule,
    MaintenanceModule,
    TrainingModule,
    ReportsModule,
    AgendaModule,
    GraphicsModule,
    ChatModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new (require('@nestjs/common').ValidationPipe)({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
