import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as webauthn from '@simplewebauthn/server';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceSecurityService } from './attendance-security.service';

jest.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: jest.fn(),
  generateRegistrationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
}));

describe('AttendanceSecurityService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('issues an opaque badge token and revokes older cards', async () => {
    const employee = {
      id: 'employee-1',
      code: 'EMP-001',
      firstName: 'Albert',
      lastName: 'Mulonga',
      position: 'Developer',
      photo: null,
      status: 'ACTIVE',
      department: { name: 'Informatique' },
    };
    const transaction = {
      employeeCard: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'card-1' }),
      },
    };
    const transactionRunner = jest.fn(
      async (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(transaction as unknown as Prisma.TransactionClient),
    );
    const prisma = {
      employee: { findUnique: jest.fn().mockResolvedValue(employee) },
      $transaction: transactionRunner,
    } as unknown as PrismaService;
    const service = new AttendanceSecurityService(prisma);

    const issued = await service.issueEmployeeCard(employee.id);
    const createData = transaction.employeeCard.create.mock.calls[0][0].data;

    expect(issued.token).toHaveLength(43);
    expect(createData.tokenHash).toBe(
      createHash('sha256').update(issued.token, 'utf8').digest('hex'),
    );
    expect(createData.tokenHash).not.toBe(issued.token);
    expect(transaction.employeeCard.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: employee.id, revokedAt: null } }),
    );
    expect(issued.employee.department).toBe('Informatique');
  });

  it('rejects attendance scans for revoked or unknown QR codes', async () => {
    const prisma = {
      employeeCard: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new AttendanceSecurityService(prisma);

    await expect(service.attendanceOptions('x'.repeat(43))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not offer a biometric-free attendance path', async () => {
    const prisma = {
      employeeCard: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'card-1',
          employeeId: 'employee-1',
          revokedAt: null,
          employee: {
            id: 'employee-1',
            code: 'EMP-001',
            firstName: 'Albert',
            lastName: 'Mulonga',
            status: 'ACTIVE',
          },
        }),
      },
      employeeAuthenticator: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new AttendanceSecurityService(prisma);

    await expect(service.attendanceOptions('x'.repeat(43))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(webauthn.generateAuthenticationOptions).not.toHaveBeenCalled();
  });

  it('records attendance only after a verified, single-use WebAuthn challenge', async () => {
    const options = {
      challenge: 'attendance-challenge',
      rpId: 'localhost',
      userVerification: 'required' as const,
    };
    const challenge = {
      id: 'challenge-123456',
      challenge: options.challenge,
      employeeId: 'employee-1',
      purpose: 'ATTENDANCE',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const card = {
      id: 'card-1',
      employeeId: 'employee-1',
      revokedAt: null,
      employee: {
        id: 'employee-1',
        code: 'EMP-001',
        firstName: 'Albert',
        lastName: 'Mulonga',
        status: 'ACTIVE',
      },
    };
    const credential = {
      id: 'authenticator-1',
      employeeId: 'employee-1',
      credentialId: 'credential-1',
      publicKey: Buffer.from([1, 2, 3]),
      counter: 0,
      transports: '["internal"]',
    };
    const attendance = {
      id: 'attendance-1',
      employeeId: 'employee-1',
      checkInMethod: 'QR_WEBAUTHN',
    };
    const transaction = {
      attendanceChallenge: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      employeeCard: {
        findFirst: jest.fn().mockResolvedValue({ employeeId: 'employee-1' }),
      },
      employeeAuthenticator: {
        update: jest.fn().mockResolvedValue(credential),
      },
      attendance: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(attendance),
      },
    };
    const transactionRunner = jest.fn(
      async (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(transaction as unknown as Prisma.TransactionClient),
    );
    const prisma = {
      employeeCard: { findUnique: jest.fn().mockResolvedValue(card) },
      employeeAuthenticator: {
        findMany: jest.fn().mockResolvedValue([credential]),
        findFirst: jest.fn().mockResolvedValue(credential),
      },
      attendanceChallenge: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: challenge.id }),
        findFirst: jest.fn().mockResolvedValue(challenge),
      },
      $transaction: transactionRunner,
    } as unknown as PrismaService;
    const service = new AttendanceSecurityService(prisma);
    jest.mocked(webauthn.generateAuthenticationOptions).mockResolvedValue(options);
    jest.mocked(webauthn.verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        credentialID: credential.credentialId,
        newCounter: 1,
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });

    const scan = await service.attendanceOptions('x'.repeat(43));
    const result = await service.verifyAttendance('x'.repeat(43), scan.challengeId, {
      id: credential.credentialId,
      rawId: credential.credentialId,
      response: {
        clientDataJSON: 'client-data',
        authenticatorData: 'authenticator-data',
        signature: 'signature',
      },
      clientExtensionResults: {},
      type: 'public-key',
    });

    expect(result.action).toBe('check-in');
    expect(transaction.attendanceChallenge.updateMany).toHaveBeenCalled();
    expect(transaction.employeeAuthenticator.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ counter: 1 }) }),
    );
    expect(transaction.attendance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: 'employee-1',
          checkInMethod: 'QR_WEBAUTHN',
        }),
      }),
    );
  });

  it('rejects replayed attendance challenges before writing attendance', async () => {
    const challenge = {
      id: 'challenge-123456',
      challenge: 'attendance-challenge',
      employeeId: 'employee-1',
      purpose: 'ATTENDANCE',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const credential = {
      id: 'authenticator-1',
      employeeId: 'employee-1',
      credentialId: 'credential-1',
      publicKey: Buffer.from([1, 2, 3]),
      counter: 0,
      transports: null,
    };
    const transaction = {
      attendanceChallenge: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const transactionRunner = jest.fn(
      async (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(transaction as unknown as Prisma.TransactionClient),
    );
    const prisma = {
      employeeCard: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'card-1',
          employeeId: 'employee-1',
          revokedAt: null,
          employee: { id: 'employee-1', status: 'ACTIVE' },
        }),
      },
      employeeAuthenticator: { findFirst: jest.fn().mockResolvedValue(credential) },
      attendanceChallenge: { findFirst: jest.fn().mockResolvedValue(challenge) },
      $transaction: transactionRunner,
    } as unknown as PrismaService;
    const service = new AttendanceSecurityService(prisma);
    jest.mocked(webauthn.verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        credentialID: credential.credentialId,
        newCounter: 1,
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });

    await expect(service.verifyAttendance('x'.repeat(43), challenge.id, {
      id: credential.credentialId,
      rawId: credential.credentialId,
      response: {
        clientDataJSON: 'client-data',
        authenticatorData: 'authenticator-data',
        signature: 'signature',
      },
      clientExtensionResults: {},
      type: 'public-key',
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
