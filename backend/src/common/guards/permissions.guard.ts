import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<{ module: string; action: string }[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.permissions) {
      throw new ForbiddenException('Accès refusé');
    }

    const hasPermission = requiredPermissions.every((required) =>
      user.permissions.some(
        (p: { module: string; action: string }) =>
          p.module === required.module && p.action === required.action,
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Vous n\'avez pas les permissions nécessaires pour cette action');
    }

    return true;
  }
}
