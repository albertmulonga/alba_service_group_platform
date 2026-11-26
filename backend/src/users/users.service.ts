import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /* ─── CREATE ─────────────────────────────────────────── */
  async create(data: any) {
    const prisma = this.prisma as any

    // Check unique email
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } })
    if (existingEmail) throw new ConflictException('Cet email est déjà utilisé')

    // Check unique phone
    if (data.phone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone: data.phone } })
      if (existingPhone) throw new ConflictException('Ce numéro de téléphone est déjà utilisé')
    }

    // Block duplicate Super Admin
    if (data.role === 'Super Administrateur' || data.roleName === 'Super Administrateur') {
      const adminRole = await prisma.role.findFirst({ where: { name: 'Super Administrateur' } })
      if (adminRole) {
        const existingAdmin = await prisma.userRole.findFirst({ where: { roleId: adminRole.id } })
        if (existingAdmin) throw new ConflictException('Un Super Administrateur existe déjà. Impossible d\'en ajouter un deuxième.')
      }
    }

    // Generate username if not provided
    const username = data.username || data.email.split('@')[0] + '_' + Date.now().toString(36)
    const existingUser = await prisma.user.findUnique({ where: { username } })
    const finalUsername = existingUser ? username + '_' + Math.random().toString(36).slice(2, 5) : username

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12)

    // Get default company
    const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!company) throw new BadRequestException('Aucune entreprise configurée')

    // Resolve departmentId from name if needed
    let departmentId = data.departmentId
    if (!departmentId && data.department) {
      const dept = await prisma.department.findFirst({ where: { name: data.department } })
      if (dept) departmentId = dept.id
    }

    // Resolve branchId from agency name if needed
    let branchId = data.branchId
    if (!branchId && data.agency) {
      const branch = await prisma.branch.findFirst({ where: { name: data.agency } })
      if (branch) branchId = branch.id
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: finalUsername,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        position: data.position,
        photo: data.photo,
        departmentId,
        branchId,
        companyId: company.id,
        status: data.status || 'ACTIVE',
        mustChangePwd: false,
      },
      include: { roles: { include: { role: true } }, department: true, branch: true },
      omit: { password: true },
    })

    // Assign role if provided — try roleId, then name, then slug
    let assignedRole = false
    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { id: data.roleId } })
      if (role) {
        await prisma.userRole.create({ data: { userId: user.id, roleId: data.roleId } })
        assignedRole = true
      }
    }
    if (!assignedRole && data.role) {
      // Normalize accents for slug comparison (é → e, etc.)
      const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const slugify = (s: string) => stripAccents(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      let role = await prisma.role.findFirst({ where: { name: data.role } })
        || await prisma.role.findFirst({ where: { slug: slugify(data.role) } })
      if (role) {
        await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } })
        assignedRole = true
      } else {
        this.logger.warn(`Role "${data.role}" not found for user ${user.id}`)
      }
    }
    if (!assignedRole) {
      // Fallback: assign the lowest-privilege role (employee)
      const fallbackRole = await prisma.role.findFirst({ where: { slug: 'employee' } })
      if (fallbackRole) {
        await prisma.userRole.create({ data: { userId: user.id, roleId: fallbackRole.id } })
      }
    }

    return prisma.user.findUnique({
      where: { id: user.id },
      omit: { password: true },
      include: { roles: { include: { role: true } }, department: true },
    })
  }

  /* ─── READ ALL ────────────────────────────────────────── */

  async findAll(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.roleId) where.roles = { some: { roleId: filters.roleId } };
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.user.findMany({
      where,
      omit: { password: true },
      include: { roles: { include: { role: true } }, department: true, branch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({
      where: { id },
      omit: { password: true },
      include: { roles: { include: { role: true } }, department: true, branch: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async update(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    const allowedFields = ['email', 'firstName', 'lastName', 'phone', 'position', 'photo', 'status', 'departmentId', 'branchId'];
    const safeData: any = { updatedAt: new Date() };
    for (const key of allowedFields) {
      if (data[key] !== undefined) safeData[key] = data[key];
    }
    // Check email uniqueness on update
    if (safeData.email) {
      const emailOwner = await prisma.user.findUnique({ where: { email: safeData.email } })
      if (emailOwner && emailOwner.id !== id) throw new ConflictException('Cet email est déjà utilisé par un autre utilisateur')
    }
    // Check phone uniqueness on update
    if (safeData.phone) {
      const phoneOwner = await prisma.user.findFirst({ where: { phone: safeData.phone } })
      if (phoneOwner && phoneOwner.id !== id) throw new ConflictException('Ce numéro de téléphone est déjà utilisé par un autre utilisateur')
    }
    const user = await prisma.user.update({
      where: { id },
      data: safeData,
      omit: { password: true },
      include: { roles: { include: { role: true } }, department: true, branch: true },
    });
    // Update role if provided
    if (data.role) {
      const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const slugify = (s: string) => stripAccents(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const role = await prisma.role.findFirst({ where: { name: data.role } })
        || await prisma.role.findFirst({ where: { slug: slugify(data.role) } })
      if (role) {
        // Block assigning Super Admin if another user already has it
        if (role.name === 'Super Administrateur') {
          const existingAdmin = await prisma.userRole.findFirst({ where: { roleId: role.id } })
          if (existingAdmin && existingAdmin.userId !== id) throw new ConflictException('Un Super Administrateur existe déjà')
        }
        // Remove old roles and assign new one
        await prisma.userRole.deleteMany({ where: { userId: id } })
        await prisma.userRole.create({ data: { userId: id, roleId: role.id } })
      }
    }

    try {
      if (userId) {
        await prisma.activityLog.create({
          data: {
            userId,
            action: 'update',
            module: 'users',
            entityId: id,
            entityType: 'user',
            description: `Mise à jour de l'utilisateur ${user.email}`,
          },
        });
      }
    } catch { /* activity log failure is non-critical */ }
    return user;
  }

  async remove(id: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    await prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  async assignRole(userId: string, roleId: string) {
    const prisma = this.prisma as any;
    await this.findOne(userId);
    return prisma.userRole.create({
      data: { userId, roleId },
      include: { role: true, user: true },
    });
  }

  /* ─── GET ALL ROLES ───────────────────────────────────── */
  async getRoles() {
    const prisma = this.prisma as any;
    return prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  /* ─── RESET PASSWORD ─────────────────────────────────── */
  async resetPassword(id: string, newPassword: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    const hashed = await bcrypt.hash(newPassword, 12);
    return prisma.user.update({ where: { id }, data: { password: hashed, mustChangePwd: true }, omit: { password: true } });
  }

  /* ─── TOGGLE STATUS ──────────────────────────────────── */
  async toggleStatus(id: string) {
    const prisma = this.prisma as any;
    const user = await this.findOne(id);
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return prisma.user.update({ where: { id }, data: { status: newStatus } });
  }
}
