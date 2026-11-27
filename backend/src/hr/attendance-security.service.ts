import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthenticationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { createHash, randomBytes } from 'node:crypto';
import { AttendanceChallengePurpose, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const ATTENDANCE_TIME_ZONE = 'Africa/Lubumbashi';

type WebAuthnChallenge = {
  challengeId: string;
  options: Awaited<ReturnType<typeof generateAuthenticationOptions>>;
};

@Injectable()
export class AttendanceSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async issueEmployeeCard(
    employeeId: string,
    transaction?: Prisma.TransactionClient,
  ) {
    if (transaction) {
      return this.issueEmployeeCardInTransaction(employeeId, transaction);
    }

    return this.prisma.$transaction((tx) =>
      this.issueEmployeeCardInTransaction(employeeId, tx),
    );
  }

  private async issueEmployeeCardInTransaction(
    employeeId: string,
    transaction: Prisma.TransactionClient,
  ) {
    const employee = await transaction.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employé avec ID ${employeeId} introuvable`);
    }
    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException('Un badge ne peut être émis que pour un employé actif');
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashCardToken(token);
    const issuedAt = new Date();

    await transaction.employeeCard.updateMany({
      where: { employeeId, revokedAt: null },
      data: { revokedAt: issuedAt },
    });
    await transaction.employeeCard.create({
      data: { employeeId, tokenHash, issuedAt },
    });

    return {
      token,
      issuedAt,
      employee: {
        id: employee.id,
        code: employee.code,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        photo: employee.photo,
        department: employee.department?.name ?? '',
      },
    };
  }

  async registrationOptions(userId: string) {
    const { employee, user } = await this.findOwnEmployee(userId);
    const { rpID, rpName } = this.getRelyingParty();
    const existing = await this.prisma.employeeAuthenticator.findMany({
      where: { employeeId: employee.id },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(employee.id),
      userName: user.email,
      userDisplayName: `${employee.firstName} ${employee.lastName}`.trim(),
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'discouraged',
        userVerification: 'required',
      },
      excludeCredentials: existing.map((credential) => ({
        id: credential.credentialId,
        transports: this.parseTransports(credential.transports),
      })),
    });

    const challenge = await this.createChallenge(
      employee.id,
      AttendanceChallengePurpose.REGISTRATION,
      options.challenge,
    );

    return { challengeId: challenge.id, options };
  }

  async verifyRegistration(
    userId: string,
    challengeId: string,
    response: RegistrationResponseJSON,
  ) {
    this.validateChallengeId(challengeId);
    this.validateRegistrationResponse(response);
    const { employee } = await this.findOwnEmployee(userId);
    const challenge = await this.getPendingChallenge(
      challengeId,
      employee.id,
      AttendanceChallengePurpose.REGISTRATION,
    );
    const { origin, rpID } = this.getRelyingParty();
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo.userVerified) {
      throw new UnauthorizedException('La vérification Windows Hello a échoué');
    }

    const credential = verification.registrationInfo.credential;
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await this.consumeChallenge(transaction, challenge.id, now);
      await transaction.employeeAuthenticator.create({
        data: {
          employeeId: employee.id,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports
            ? JSON.stringify(credential.transports)
            : null,
        },
      });
    });

    return { registered: true };
  }

  async attendanceOptions(cardToken: string): Promise<WebAuthnChallenge & {
    employee: { id: string; code: string; firstName: string; lastName: string };
  }> {
    const card = await this.findActiveCard(cardToken);
    const credentials = await this.prisma.employeeAuthenticator.findMany({
      where: { employeeId: card.employeeId },
      select: { credentialId: true, transports: true },
    });
    if (credentials.length === 0) {
      throw new BadRequestException(
        'Aucune vérification Windows Hello n’est enregistrée pour cet employé',
      );
    }

    const { rpID } = this.getRelyingParty();
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        transports: this.parseTransports(credential.transports),
      })),
      userVerification: 'required',
    });
    const challenge = await this.createChallenge(
      card.employeeId,
      AttendanceChallengePurpose.ATTENDANCE,
      options.challenge,
    );

    return {
      challengeId: challenge.id,
      options,
      employee: {
        id: card.employee.id,
        code: card.employee.code,
        firstName: card.employee.firstName,
        lastName: card.employee.lastName,
      },
    };
  }

  async verifyAttendance(
    cardToken: string,
    challengeId: string,
    response: AuthenticationResponseJSON,
  ) {
    this.validateChallengeId(challengeId);
    this.validateAuthenticationResponse(response);
    const card = await this.findActiveCard(cardToken);
    const challenge = await this.getPendingChallenge(
      challengeId,
      card.employeeId,
      AttendanceChallengePurpose.ATTENDANCE,
    );
    const credential = await this.prisma.employeeAuthenticator.findFirst({
      where: { employeeId: card.employeeId, credentialId: response.id },
    });
    if (!credential) {
      throw new UnauthorizedException('Le vérificateur Windows Hello ne correspond pas à cet employé');
    }

    const { origin, rpID } = this.getRelyingParty();
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: credential.counter,
        transports: this.parseTransports(credential.transports),
      },
    });
    if (!verification.verified || !verification.authenticationInfo.userVerified) {
      throw new UnauthorizedException('La vérification Windows Hello a échoué');
    }

    const now = new Date();
    return this.prisma.$transaction(async (transaction) => {
      await this.consumeChallenge(transaction, challenge.id, now);

      const currentCard = await transaction.employeeCard.findFirst({
        where: {
          id: card.id,
          revokedAt: null,
          employee: { status: 'ACTIVE' },
        },
        select: { employeeId: true },
      });
      if (!currentCard) {
        throw new UnauthorizedException('Ce badge a été révoqué ou désactivé');
      }

      await transaction.employeeAuthenticator.update({
        where: { id: credential.id },
        data: {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: now,
        },
      });

      return this.recordAttendance(transaction, currentCard.employeeId, now);
    });
  }

  private async findOwnEmployee(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new UnauthorizedException('Session utilisateur invalide');
    }

    let employee = await this.prisma.employee.findFirst({
      where: {
        status: 'ACTIVE',
        userId,
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    if (!employee) {
      const emailMatches = await this.prisma.employee.findMany({
        where: { status: 'ACTIVE', email: user.email },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        take: 2,
      });
      if (emailMatches.length > 1) {
        throw new ConflictException(
          'Plusieurs fiches employé utilisent le courriel de ton compte. Contacte l’administration pour les relier.',
        );
      }
      employee = emailMatches[0] ?? null;
    }
    if (!employee) {
      throw new NotFoundException(
        'Aucun employé actif ne correspond à ton compte. Vérifie que le courriel du compte et celui de la fiche employé sont identiques.',
      );
    }
    if (employee.userId && employee.userId !== userId) {
      throw new ConflictException('Cette fiche employé est déjà liée à un autre compte');
    }

    if (!employee.userId) {
      const linked = await this.prisma.employee.updateMany({
        where: { id: employee.id, userId: null },
        data: { userId },
      });
      if (linked.count !== 1) {
        employee = await this.prisma.employee.findUnique({
          where: { id: employee.id },
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
        if (!employee || employee.userId !== userId) {
          throw new ConflictException('Cette fiche employé a été liée à un autre compte');
        }
      }
    }

    return { employee, user };
  }

  private async findActiveCard(cardToken: string) {
    if (typeof cardToken !== 'string' || cardToken.length < 40 || cardToken.length > 64) {
      throw new UnauthorizedException('QR de badge invalide');
    }
    const tokenHash = this.hashCardToken(cardToken);
    const card = await this.prisma.employeeCard.findUnique({
      where: { tokenHash },
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });
    if (!card || card.revokedAt || card.employee.status !== 'ACTIVE') {
      throw new UnauthorizedException('QR de badge invalide ou révoqué');
    }
    return card;
  }

  private async createChallenge(
    employeeId: string,
    purpose: AttendanceChallengePurpose,
    challenge: string,
  ) {
    const now = new Date();
    await this.prisma.attendanceChallenge.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return this.prisma.attendanceChallenge.create({
      data: {
        employeeId,
        purpose,
        challenge,
        expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
      },
      select: { id: true },
    });
  }

  private async getPendingChallenge(
    id: string,
    employeeId: string,
    purpose: AttendanceChallengePurpose,
  ) {
    const challenge = await this.prisma.attendanceChallenge.findFirst({
      where: {
        id,
        employeeId,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!challenge) {
      throw new UnauthorizedException('La demande de vérification a expiré ou a déjà été utilisée');
    }
    return challenge;
  }

  private async consumeChallenge(
    transaction: Prisma.TransactionClient,
    challengeId: string,
    now: Date,
  ) {
    const result = await transaction.attendanceChallenge.updateMany({
      where: {
        id: challengeId,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (result.count !== 1) {
      throw new ConflictException('La demande de vérification a déjà été utilisée ou a expiré');
    }
  }

  private async recordAttendance(
    transaction: Prisma.TransactionClient,
    employeeId: string,
    now: Date,
  ) {
    const dateParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: ATTENDANCE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const dateKey = `${dateParts.find((part) => part.type === 'year')?.value}-${dateParts.find((part) => part.type === 'month')?.value}-${dateParts.find((part) => part.type === 'day')?.value}`;
    const attendanceDate = new Date(`${dateKey}T00:00:00.000Z`);
    const existing = await transaction.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: attendanceDate } },
    });

    if (!existing) {
      const { hour, minute } = this.getLocalTime(now);
      const status = hour > 8 || (hour === 8 && minute > 0) ? 'late' : 'present';
      const attendance = await transaction.attendance.create({
        data: {
          employeeId,
          date: attendanceDate,
          checkIn: now,
          checkInMethod: 'QR_WEBAUTHN',
          status,
        },
      });
      return { action: 'check-in' as const, attendance };
    }

    if (!existing.checkIn) {
      const attendance = await transaction.attendance.update({
        where: { id: existing.id },
        data: {
          checkIn: now,
          checkInMethod: 'QR_WEBAUTHN',
          status: 'present',
        },
      });
      return { action: 'check-in' as const, attendance };
    }
    if (existing.checkOut) {
      throw new ConflictException('Les arrivées et départs de cet employé sont déjà enregistrés pour aujourd’hui');
    }

    const attendance = await transaction.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        checkOutMethod: 'QR_WEBAUTHN',
        hoursWorked: Math.max(0, (now.getTime() - existing.checkIn.getTime()) / 3_600_000),
      },
    });
    return { action: 'check-out' as const, attendance };
  }

  private getLocalTime(date: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: ATTENDANCE_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date).split(':').map(Number);
    return { hour: parts[0], minute: parts[1] };
  }

  private getRelyingParty() {
    const configuredOrigin = process.env.WEBAUTHN_ORIGIN;
    const configuredRpID = process.env.WEBAUTHN_RP_ID;
    if (process.env.NODE_ENV === 'production' && (!configuredOrigin || !configuredRpID)) {
      throw new ServiceUnavailableException(
        'WEBAUTHN_ORIGIN et WEBAUTHN_RP_ID doivent être configurés en production',
      );
    }
    const origin = configuredOrigin ?? 'http://localhost:3000';
    const rpID = configuredRpID ?? new URL(origin).hostname;
    return {
      origin,
      rpID,
      rpName: process.env.WEBAUTHN_RP_NAME ?? 'ALBA SERVICE GROUP',
    };
  }

  private hashCardToken(token: string) {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private parseTransports(value: string | null) {
    if (!value) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      throw new BadRequestException('Les informations du vérificateur sont invalides');
    }
    return parsed;
  }

  private validateChallengeId(challengeId: string) {
    if (typeof challengeId !== 'string' || challengeId.length < 8 || challengeId.length > 64) {
      throw new BadRequestException('Identifiant de vérification invalide');
    }
  }

  private validateRegistrationResponse(response: RegistrationResponseJSON) {
    if (
      !response
      || response.type !== 'public-key'
      || typeof response.id !== 'string'
      || typeof response.response?.clientDataJSON !== 'string'
      || typeof response.response?.attestationObject !== 'string'
    ) {
      throw new BadRequestException('La réponse Windows Hello est invalide');
    }
  }

  private validateAuthenticationResponse(response: AuthenticationResponseJSON) {
    if (
      !response
      || response.type !== 'public-key'
      || typeof response.id !== 'string'
      || typeof response.response?.clientDataJSON !== 'string'
      || typeof response.response?.authenticatorData !== 'string'
      || typeof response.response?.signature !== 'string'
    ) {
      throw new BadRequestException('La réponse Windows Hello est invalide');
    }
  }
}
