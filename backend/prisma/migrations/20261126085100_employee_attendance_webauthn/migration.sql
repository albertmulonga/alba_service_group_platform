CREATE TYPE "AttendanceChallengePurpose" AS ENUM ('REGISTRATION', 'ATTENDANCE');

CREATE TABLE "EmployeeAuthenticator" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "EmployeeAuthenticator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceChallenge" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "purpose" "AttendanceChallengePurpose" NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeAuthenticator_credentialId_key" ON "EmployeeAuthenticator"("credentialId");
CREATE INDEX "EmployeeAuthenticator_employeeId_idx" ON "EmployeeAuthenticator"("employeeId");
CREATE UNIQUE INDEX "AttendanceChallenge_challenge_key" ON "AttendanceChallenge"("challenge");
CREATE INDEX "AttendanceChallenge_employeeId_purpose_expiresAt_idx" ON "AttendanceChallenge"("employeeId", "purpose", "expiresAt");

ALTER TABLE "EmployeeAuthenticator" ADD CONSTRAINT "EmployeeAuthenticator_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceChallenge" ADD CONSTRAINT "AttendanceChallenge_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
