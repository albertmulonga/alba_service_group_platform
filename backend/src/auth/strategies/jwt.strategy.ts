import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        companyId: true,
        branchId: true,
        departmentId: true,
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

    if (!user) {
      throw new UnauthorizedException('Compte utilisateur introuvable');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Compte désactivé. Veuillez contacter l\'administrateur.');
    }

    // Flatten permissions for easy access
    const permissions = user.roles.flatMap((ur: any) =>
      ur.role.permissions.map((rp: any) => ({
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.companyId,
      branchId: user.branchId,
      departmentId: user.departmentId,
      permissions,
    };
  }
}
