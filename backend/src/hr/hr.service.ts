import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceSecurityService } from './attendance-security.service';

@Injectable()
export class HrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceSecurityService: AttendanceSecurityService,
  ) {}

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

  async onboardEmployee(data: any) {
    const firstName = typeof data?.firstName === 'string' ? data.firstName.trim() : '';
    const lastName = typeof data?.lastName === 'string' ? data.lastName.trim() : '';
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = typeof data?.password === 'string' ? data.password : '';

    if (!firstName || !lastName) {
      throw new BadRequestException('Le prénom et le nom de l’employé sont requis');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Un courriel professionnel valide est requis');
    }
    if (!password.trim()) {
      throw new BadRequestException('Un mot de passe initial est requis pour le compte employé');
    }

    const hireDateValue = data.hireDate || new Date().toISOString().slice(0, 10);
    if (typeof hireDateValue !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(hireDateValue)) {
      throw new BadRequestException('La date d’embauche doit être au format AAAA-MM-JJ');
    }
    const hireDate = new Date(`${hireDateValue}T00:00:00.000Z`);
    if (Number.isNaN(hireDate.getTime()) || hireDate.toISOString().slice(0, 10) !== hireDateValue) {
      throw new BadRequestException('La date d’embauche est invalide');
    }

    const contractTypes: Record<string, 'CDI' | 'CDD' | 'INTERN' | 'CONSULTANT'> = {
      CDI: 'CDI',
      CDD: 'CDD',
      Stage: 'INTERN',
      Freelance: 'CONSULTANT',
    };
    const contractType = contractTypes[data.contractType] ?? 'CDI';
    const salary = Number(data.salary ?? 0);
    if (!Number.isFinite(salary) || salary < 0) {
      throw new BadRequestException('Le salaire de base doit être un nombre positif ou nul');
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    return this.prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ConflictException('Cet email est déjà utilisé par un autre compte');
      }

      const [company, employeeRole] = await Promise.all([
        transaction.company.findFirst({ orderBy: { createdAt: 'asc' } }),
        transaction.role.findUnique({ where: { slug: 'employee' } }),
      ]);
      if (!company) {
        throw new BadRequestException('Aucune entreprise configurée');
      }
      if (!employeeRole) {
        throw new BadRequestException('Le rôle Employé doit être configuré avant de créer un compte');
      }

      const department = data.department
        ? await transaction.department.findFirst({
          where: { name: { equals: data.department, mode: 'insensitive' } },
        })
        : null;
      if (data.department && !department) {
        throw new BadRequestException(`Le département « ${data.department} » n’existe pas`);
      }
      const branch = data.agency
        ? await transaction.branch.findFirst({
          where: { name: { equals: data.agency, mode: 'insensitive' } },
        })
        : null;
      if (data.agency && !branch) {
        throw new BadRequestException(`L’agence « ${data.agency} » n’existe pas`);
      }

      const position = typeof data.function === 'string' && data.function.trim()
        ? data.function.trim()
        : 'Non défini';
      const user = await transaction.user.create({
        data: {
          companyId: company.id,
          branchId: branch?.id,
          departmentId: department?.id,
          email,
          username: `${email.split('@')[0]}_${randomBytes(4).toString('hex')}`,
          password: hashedPassword,
          firstName,
          lastName,
          phone: typeof data.phone === 'string' && data.phone.trim() ? data.phone.trim() : null,
          position,
          photo: typeof data.photo === 'string' ? data.photo : null,
          status: 'ACTIVE',
          mustChangePwd: false,
        },
        select: { id: true, email: true, username: true },
      });
      await transaction.userRole.create({
        data: { userId: user.id, roleId: employeeRole.id },
      });

      const employee = await transaction.employee.create({
        data: {
          code: `EMP-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`,
          userId: user.id,
          departmentId: department?.id,
          firstName,
          lastName,
          phone: typeof data.phone === 'string' && data.phone.trim() ? data.phone.trim() : null,
          email,
          photo: typeof data.photo === 'string' ? data.photo : null,
          position,
          hireDate,
          status: 'ACTIVE',
        },
        include: { department: true, contracts: true },
      });
      await transaction.contract.create({
        data: {
          employeeId: employee.id,
          type: contractType,
          startDate: hireDate,
          position,
          baseSalary: salary,
          status: 'active',
        },
      });

      const badge = await this.attendanceSecurityService.issueEmployeeCard(employee.id, transaction);
      return { account: user, employee, badge };
    });
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

  async findAttendanceDashboard() {
    const records = await this.prismaClient.attendance.findMany({
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 2000,
    });
    return records.map((record: any) => this.toAttendanceDashboardRecord(record));
  }

  async createAttendanceDashboard(data: any) {
    if (typeof data?.employeeId !== 'string' || !data.employeeId) {
      throw new BadRequestException('Un employé doit être sélectionné');
    }
    const employee = await this.prismaClient.employee.findUnique({
      where: { id: data.employeeId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employé avec ID ${data.employeeId} introuvable`);
    }

    const dateKey = this.validateAttendanceDate(data.date);
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    const existing = await this.prismaClient.attendance.findUnique({
      where: { employeeId_date: { employeeId: data.employeeId, date } },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Une présence existe déjà pour cet employé et cette date');
    }

    const checkIn = this.parseAttendanceTime(dateKey, data.clockIn);
    const checkOut = this.parseAttendanceTime(dateKey, data.clockOut);
    if (checkOut && !checkIn) {
      throw new BadRequestException('Une heure d’arrivée est requise avant l’heure de départ');
    }
    const attendance = await this.prismaClient.attendance.create({
      data: {
        employeeId: data.employeeId,
        date,
        checkIn,
        checkOut,
        checkInMethod: checkIn ? 'MANUAL' : null,
        checkOutMethod: checkOut ? 'MANUAL' : null,
        status: this.toStoredAttendanceStatus(data.status),
        hoursWorked: checkIn && checkOut
          ? Math.max(0, (checkOut.getTime() - checkIn.getTime()) / 3_600_000)
          : null,
        notes: typeof data.notes === 'string' ? data.notes : null,
      },
    });
    return this.getAttendanceDashboardRecord(attendance.id);
  }

  async updateAttendanceDashboard(id: string, data: any) {
    const existing = await this.prismaClient.attendance.findUnique({
      where: { id },
      select: { id: true, date: true, checkIn: true, checkOut: true },
    });
    if (!existing) {
      throw new NotFoundException(`Présence avec ID ${id} introuvable`);
    }

    const dateKey = existing.date.toISOString().slice(0, 10);
    const updateData: Record<string, unknown> = {};
    let checkIn = existing.checkIn;
    let checkOut = existing.checkOut;
    if (Object.prototype.hasOwnProperty.call(data, 'clockIn')) {
      checkIn = this.parseAttendanceTime(dateKey, data.clockIn);
      updateData.checkIn = checkIn;
      updateData.checkInMethod = checkIn ? 'MANUAL' : null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'clockOut')) {
      checkOut = this.parseAttendanceTime(dateKey, data.clockOut);
      updateData.checkOut = checkOut;
      updateData.checkOutMethod = checkOut ? 'MANUAL' : null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'status')) {
      updateData.status = this.toStoredAttendanceStatus(data.status);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'notes')) {
      updateData.notes = typeof data.notes === 'string' ? data.notes : null;
    }
    if (checkOut && !checkIn) {
      throw new BadRequestException('Une heure d’arrivée est requise avant l’heure de départ');
    }
    if (checkIn && checkOut) {
      updateData.hoursWorked = Math.max(0, (checkOut.getTime() - checkIn.getTime()) / 3_600_000);
    } else if (Object.prototype.hasOwnProperty.call(data, 'clockIn')
      || Object.prototype.hasOwnProperty.call(data, 'clockOut')) {
      updateData.hoursWorked = null;
    }

    await this.prismaClient.attendance.update({ where: { id }, data: updateData });
    return this.getAttendanceDashboardRecord(id);
  }

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

  private async getAttendanceDashboardRecord(id: string) {
    const record = await this.prismaClient.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
    });
    if (!record) {
      throw new NotFoundException(`Présence avec ID ${id} introuvable`);
    }
    return this.toAttendanceDashboardRecord(record);
  }

  private toAttendanceDashboardRecord(record: any) {
    const totalMinutes = record.hoursWorked == null
      ? null
      : Math.max(0, Math.round(record.hoursWorked * 60));
    const hours = totalMinutes == null ? null : Math.floor(totalMinutes / 60);
    const minutes = totalMinutes == null ? null : totalMinutes % 60;
    const status = String(record.status).toLowerCase();
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: `${record.employee?.firstName ?? ''} ${record.employee?.lastName ?? ''}`.trim(),
      department: record.employee?.department?.name ?? '',
      date: record.date.toISOString().slice(0, 10),
      clockIn: record.checkIn ? this.formatAttendanceClock(record.checkIn) : '',
      clockOut: record.checkOut ? this.formatAttendanceClock(record.checkOut) : '',
      duration: hours == null || minutes == null ? '' : `${hours}h${String(minutes).padStart(2, '0')}`,
      status: status === 'late'
        ? 'En retard'
        : status === 'absent'
          ? 'Absent'
          : status === 'holiday'
            ? 'Conge'
            : status === 'present' || status === 'half_day'
              ? 'Present'
              : record.status,
      notes: record.notes ?? '',
    };
  }

  private formatAttendanceClock(date: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lubumbashi',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  }

  private validateAttendanceDate(value: unknown) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('La date de présence doit être au format AAAA-MM-JJ');
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('La date de présence est invalide');
    }
    return value;
  }

  private parseAttendanceTime(dateKey: string, value: unknown): Date | null {
    if (value == null || value === '') {
      return null;
    }
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new BadRequestException('L’heure de présence doit être au format HH:MM');
    }
    return new Date(`${dateKey}T${value}:00+02:00`);
  }

  private toStoredAttendanceStatus(value: unknown) {
    switch (value) {
      case 'Present':
        return 'present';
      case 'En retard':
        return 'late';
      case 'Absent':
        return 'absent';
      case 'Conge':
        return 'holiday';
      case 'present':
      case 'late':
      case 'absent':
      case 'holiday':
      case 'half_day':
        return value;
      default:
        throw new BadRequestException('Le statut de présence est invalide');
    }
  }
}