import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  private get prismaClient() {
    return this.prisma as any;
  }

  // --- EMPLOYEES ---

  async findAllEmployees(params: { page?: number; limit?: number; status?: string; departmentId?: string }) {
    const { page = 1, limit = 10, status, departmentId } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const [data, total] = await Promise.all([
      this.prismaClient.employee.findMany({
        where,
        skip,
        take: limit,
        include: { department: true, contracts: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaClient.employee.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneEmployee(id: string) {
    const employee = await this.prismaClient.employee.findUnique({
      where: { id },
      include: { department: true, contracts: true, attendance: true, leaves: true, salaries: true },
    });
    if (!employee) throw new NotFoundException(`Employé avec ID ${id} introuvable`);
    return employee;
  }

  async createEmployee(data: any) {
    const prisma = this.prisma as any;
    const code = data.code || `EMP-${Date.now().toString(36).toUpperCase()}`;
    const existing = await prisma.employee.findUnique({ where: { code } });
    if (existing) throw new BadRequestException(`Un employé avec le code ${code} existe déjà`);
    return prisma.employee.create({ data: { ...data, code } });
  }

  async updateEmployee(id: string, data: any) {
    await this.findOneEmployee(id);
    return this.prismaClient.employee.update({ where: { id }, data });
  }

  async deleteEmployee(id: string) {
    await this.findOneEmployee(id);
    return this.prismaClient.employee.delete({ where: { id } });
  }

  // --- CONTRACTS ---

  async findAllContracts(employeeId: string) {
    await this.findOneEmployee(employeeId);
    return this.prismaClient.contract.findMany({ where: { employeeId }, orderBy: { startDate: 'desc' } });
  }

  async findOneContract(employeeId: string, contractId: string) {
    await this.findOneEmployee(employeeId);
    const contract = await this.prismaClient.contract.findFirst({
      where: { id: contractId, employeeId },
    });
    if (!contract) throw new NotFoundException(`Contrat avec ID ${contractId} introuvable`);
    return contract;
  }

  async createContract(employeeId: string, data: any) {
    await this.findOneEmployee(employeeId);
    return this.prismaClient.contract.create({ data: { ...data, employeeId } });
  }

  async updateContract(employeeId: string, contractId: string, data: any) {
    await this.findOneContract(employeeId, contractId);
    return this.prismaClient.contract.update({ where: { id: contractId }, data });
  }

  async deleteContract(employeeId: string, contractId: string) {
    await this.findOneContract(employeeId, contractId);
    return this.prismaClient.contract.delete({ where: { id: contractId } });
  }

  // --- ATTENDANCE ---

  async findAllAttendance(employeeId: string, params: { page?: number; limit?: number; month?: number; year?: number }) {
    await this.findOneEmployee(employeeId);
    const { page = 1, limit = 10, month, year } = params;
    const skip = (page - 1) * limit;
    const where: any = { employeeId };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }
    const [data, total] = await Promise.all([
      this.prismaClient.attendance.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      this.prismaClient.attendance.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createAttendance(employeeId: string, data: any) {
    await this.findOneEmployee(employeeId);
    const existing = await this.prismaClient.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: new Date(data.date) } },
    });
    if (existing) throw new BadRequestException(`Une présence existe déjà pour cette date`);
    return this.prismaClient.attendance.create({ data: { ...data, employeeId } });
  }

  async updateAttendance(employeeId: string, attendanceId: string, data: any) {
    await this.findOneEmployee(employeeId);
    const att = await this.prismaClient.attendance.findFirst({
      where: { id: attendanceId, employeeId },
    });
    if (!att) throw new NotFoundException(`Présence avec ID ${attendanceId} introuvable`);
    return this.prismaClient.attendance.update({ where: { id: attendanceId }, data });
  }

  async deleteAttendance(employeeId: string, attendanceId: string) {
    await this.findOneEmployee(employeeId);
    const att = await this.prismaClient.attendance.findFirst({
      where: { id: attendanceId, employeeId },
    });
    if (!att) throw new NotFoundException(`Présence avec ID ${attendanceId} introuvable`);
    return this.prismaClient.attendance.delete({ where: { id: attendanceId } });
  }

  // --- LEAVES ---

  async findAllLeaves(params: { page?: number; limit?: number; status?: string; employeeId?: string }) {
    const { page = 1, limit = 10, status, employeeId } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const [data, total] = await Promise.all([
      this.prismaClient.leave.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaClient.leave.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneLeave(id: string) {
    const leave = await this.prismaClient.leave.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!leave) throw new NotFoundException(`Congé avec ID ${id} introuvable`);
    return leave;
  }

  async createLeave(data: any) {
    const employee = await this.prismaClient.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) throw new NotFoundException(`Employé avec ID ${data.employeeId} introuvable`);
    // Calculer le nombre de jours
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return this.prismaClient.leave.create({ data: { ...data, daysCount, status: 'PENDING' } });
  }

  async approveLeave(id: string, approvedBy: string) {
    const leave = await this.findOneLeave(id);
    if (leave.status !== 'PENDING') throw new BadRequestException(`Seul un congé en attente peut être approuvé`);
    return this.prismaClient.leave.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    });
  }

  async rejectLeave(id: string, approvedBy: string, notes?: string) {
    const leave = await this.findOneLeave(id);
    if (leave.status !== 'PENDING') throw new BadRequestException(`Seul un congé en attente peut être rejeté`);
    return this.prismaClient.leave.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy, approvedAt: new Date(), notes },
    });
  }

  async deleteLeave(id: string) {
    await this.findOneLeave(id);
    return this.prismaClient.leave.delete({ where: { id } });
  }

  // --- SALARIES ---

  async findMySalaries(userId: string, params: { page?: number; limit?: number; month?: number; year?: number }) {
    const { page = 1, limit = 50, month, year } = params;
    const skip = (page - 1) * limit;
    const where: any = { employeeId: userId };
    if (month) where.month = month;
    if (year) where.year = year;

    const [data, total] = await Promise.all([
      this.prismaClient.salary.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prismaClient.salary.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async confirmSalary(id: string, userId: string) {
    const salary = await this.findOneSalary(id);
    if (salary.employeeId !== userId) {
      throw new BadRequestException('Vous ne pouvez confirmer que votre propre salaire');
    }
    if (!salary.paid) {
      throw new BadRequestException('Ce salaire n\'a pas encore été payé par l\'administration');
    }
    if (salary.confirmed) {
      throw new BadRequestException('Vous avez déjà confirmé la réception de ce salaire');
    }
    return this.prismaClient.salary.update({
      where: { id },
      data: { confirmed: true, confirmedAt: new Date() },
    });
  }

  async findAllSalaries(params: { page?: number; limit?: number; employeeId?: string; month?: number; year?: number }) {
    const { page = 1, limit = 10, employeeId, month, year } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = month;
    if (year) where.year = year;

    const [data, total] = await Promise.all([
      this.prismaClient.salary.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prismaClient.salary.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneSalary(id: string) {
    const salary = await this.prismaClient.salary.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!salary) throw new NotFoundException(`Salaire avec ID ${id} introuvable`);
    return salary;
  }

  async createSalary(data: any) {
    let employee = await this.prismaClient.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      const user = await this.prismaClient.user.findUnique({ where: { id: data.employeeId } });
      if (user) {
        const code = `USR-${user.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
        const existing = await this.prismaClient.employee.findFirst({ where: { code } });
        employee = await this.prismaClient.employee.create({
          data: {
            id: user.id,
            code: existing ? `USR-${Date.now().toString(36).toUpperCase()}` : code,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email || '',
            phone: user.phone || '',
            status: 'ACTIVE',
            position: user.position || 'Non défini',
            hireDate: new Date(),
          },
        });
      } else {
        throw new NotFoundException(`Utilisateur/Employé avec ID ${data.employeeId} introuvable`);
      }
    }
    const netAmount = Number(data.baseAmount || 0) + Number(data.bonuses || 0) - Number(data.deductions || 0);
    return this.prismaClient.salary.create({ data: { ...data, netAmount, paid: false } });
  }

  async paySalary(id: string, data?: any) {
    const salary = await this.findOneSalary(id);
    if (salary.paid) throw new BadRequestException(`Ce salaire a déjà été payé`);
    return this.prismaClient.salary.update({
      where: { id },
      data: { paid: true, paidAt: new Date() },
    });
  }

  async updateSalary(id: string, data: any) {
    await this.findOneSalary(id);
    const netAmount = data.baseAmount || data.bonuses || data.deductions
      ? Number(data.baseAmount || 0) + Number(data.bonuses || 0) - Number(data.deductions || 0)
      : undefined;
    const updateData: any = { ...data };
    if (netAmount !== undefined) updateData.netAmount = netAmount;
    return this.prismaClient.salary.update({ where: { id }, data: updateData });
  }

  async deleteSalary(id: string) {
    await this.findOneSalary(id);
    return this.prismaClient.salary.delete({ where: { id } });
  }
}