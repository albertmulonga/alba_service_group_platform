import { BadRequestException } from '@nestjs/common';
import { StockService } from './stock.service';

describe('StockService stock reports', () => {
  it('archives stock levels and movements for a complete local-time period', async () => {
    const stockReport = {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(({ create }) => Promise.resolve({ id: 'report-1', ...create })),
    };
    const product = {
      findMany: jest.fn().mockResolvedValue([{
        id: 'product-1',
        code: 'P-1',
        name: 'Paper',
        currentStock: 2,
        minStock: 5,
        criticalStock: 1,
        purchasePrice: 10,
        category: { name: 'Office' },
        unit: { name: 'Pack', code: 'PK' },
      }]),
    };
    const stockMovement = {
      findMany: jest.fn().mockResolvedValue([{
        id: 'movement-1',
        type: 'SALE',
        quantity: 1,
        quantityDelta: -1,
        reference: 'SALE-1',
        notes: null,
        createdAt: new Date('2026-03-05T12:00:00Z'),
        product: { id: 'product-1', code: 'P-1', name: 'Paper' },
      }]),
    };
    const prisma = { stockReport, product, stockMovement };
    const notifications = { notifyEmployees: jest.fn().mockResolvedValue(undefined) };
    const service = new StockService(prisma as never, notifications as never);

    await service.generateStockReport('DAILY', '2026-03-05');

    const createData = stockReport.upsert.mock.calls[0][0].create;
    expect(createData.periodStart).toEqual(new Date('2026-03-04T22:00:00.000Z'));
    expect(createData.periodEnd).toEqual(new Date('2026-03-05T22:00:00.000Z'));
    expect(createData.data).toMatchObject({
      productCount: 1,
      totalStockValue: 20,
      lowStockCount: 1,
      outOfStockCount: 0,
      movementCount: 1,
      totalsByType: { SALE: 1 },
    });
    expect(notifications.notifyEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'STOCK_REPORT_DAILY', eventId: 'report-1' }),
      expect.any(Array),
      expect.any(Array),
    );
  });

  it('rejects invalid report start dates', async () => {
    const service = new StockService({} as never, { notifyEmployees: jest.fn() } as never);

    await expect(service.generateStockReport('DAILY', '2026-02-30'))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
