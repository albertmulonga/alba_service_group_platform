import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const prisma = this.prisma as any;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: loginDto.email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        status: true,
        companyId: true,
        branchId: true,
        departmentId: true,
        mustChangePwd: true,
      },
    });

    if (!user) {
      await this.logFailedAttempt(null, loginDto.email);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Compte désactivé. Veuillez contacter l\'administrateur.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      await this.logFailedAttempt(user.id, loginDto.email);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    // Log successful login
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        status: 'SUCCESS',
        createdAt: new Date(),
      },
    });

    // Get roles and permissions
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    const permissions = userWithRoles?.roles.flatMap((ur: any) =>
      ur.role.permissions.map((rp: any) => ({
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    ) ?? [];

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId,
        branchId: user.branchId,
        departmentId: user.departmentId,
        mustChangePwd: user.mustChangePwd,
        roles: userWithRoles?.roles ?? [],
        permissions,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const prisma = this.prisma as any;

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email: registerDto.email } });
    if (existingEmail) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({ where: { username: registerDto.username } });
    if (existingUsername) {
      throw new ConflictException("Ce nom d'utilisateur est déjà utilisé");
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: registerDto.email,
        username: registerDto.username,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        middleName: registerDto.middleName,
        phone: registerDto.phone,
        companyId: registerDto.companyId || (await this.getDefaultCompany()),
        branchId: registerDto.branchId,
        departmentId: registerDto.departmentId,
        mustChangePwd: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        createdAt: true,
      },
    });

    // Assign default role
    const defaultRole = await prisma.role.findFirst({ where: { slug: 'employee' } });
    if (defaultRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        module: 'AUTH',
        entityId: user.id,
        entityType: 'User',
        description: 'Création du compte utilisateur',
      },
    });

    return {
      message: 'Compte créé avec succès',
      user,
    };
  }

  async getProfile(userId: string) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        gender: true,
        phone: true,
        address: true,
        photo: true,
        position: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        company: { select: { id: true, name: true, logo: true } },
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    return user;
  }

  private async logFailedAttempt(userId: string | null, email: string) {
    try {
      const prisma = this.prisma as any;
      await prisma.loginHistory.create({
        data: {
          userId: userId ?? 'unknown',
          status: 'FAILED',
          failReason: 'Invalid credentials',
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log login attempt for ${email}`);
    }
  }

  private async getDefaultCompany(): Promise<string> {
    try {
      const prisma = this.prisma as any;
      const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
      if (company) return company.id;
      // Create default company if none exists
      const newCompany = await prisma.company.create({
        data: { name: 'ALBA SERVICE GROUP' },
      });
      return newCompany.id;
    } catch {
      return 'default';
    }
  }
}
