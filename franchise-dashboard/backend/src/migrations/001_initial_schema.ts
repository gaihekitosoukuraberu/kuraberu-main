import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704067200000 implements MigrationInterface {
  name = 'InitialSchema1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create enums
    await queryRunner.query(`
      CREATE TYPE "user_role" AS ENUM ('admin', 'manager', 'operator')
    `);

    await queryRunner.query(`
      CREATE TYPE "case_status" AS ENUM (
        'pending_assignment',
        'assigned',
        'contact_pending',
        'hearing_scheduled',
        'hearing_complete',
        'estimate_requested',
        'estimate_received',
        'estimate_submitted',
        'contract_pending',
        'contracted'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "property_type" AS ENUM (
        'house',
        'apartment',
        'mansion',
        'store',
        'office',
        'warehouse',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "urgency" AS ENUM ('low', 'normal', 'high', 'urgent')
    `);

    await queryRunner.query(`
      CREATE TYPE "company_type" AS ENUM ('franchise', 'partner', 'direct')
    `);

    await queryRunner.query(`
      CREATE TYPE "company_status" AS ENUM ('active', 'suspended', 'terminated', 'pending')
    `);

    await queryRunner.query(`
      CREATE TYPE "account_status" AS ENUM ('active', 'inactive', 'suspended')
    `);

    await queryRunner.query(`
      CREATE TYPE "invoice_status" AS ENUM (
        'draft',
        'issued',
        'sent',
        'unpaid',
        'partially_paid',
        'paid',
        'overdue',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "deposit_status" AS ENUM ('pending', 'confirmed', 'rejected', 'refunded')
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_method" AS ENUM (
        'bank_transfer',
        'credit_card',
        'cash',
        'check',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "cancel_request_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TYPE "cancel_reason" AS ENUM (
        'customer_request',
        'duplicate_case',
        'invalid_info',
        'out_of_area',
        'no_capacity',
        'price_mismatch',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_channel" AS ENUM ('SMS', 'LINE', 'EMAIL')
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_status" AS ENUM (
        'pending',
        'sent',
        'delivered',
        'failed',
        'bounced',
        'read'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_type" AS ENUM (
        'case_assigned',
        'case_status_changed',
        'hearing_scheduled',
        'hearing_reminder',
        'estimate_ready',
        'contract_signed',
        'payment_reminder',
        'payment_received',
        'cancel_request',
        'system_alert',
        'custom'
      )
    `);

    // Create companies table
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "companyCode" varchar(20) UNIQUE NOT NULL,
        "name" varchar(255) NOT NULL,
        "tradeName" varchar(255),
        "type" company_type DEFAULT 'franchise',
        "status" company_status DEFAULT 'pending',
        "representativeName" varchar(255) NOT NULL,
        "representativePhone" varchar(20) NOT NULL,
        "representativeEmail" varchar(255) NOT NULL,
        "address" jsonb NOT NULL,
        "billingInfo" jsonb NOT NULL,
        "operatingAreas" text[] DEFAULT '{}',
        "propertyTypes" text[] DEFAULT '{}',
        "businessHours" jsonb,
        "establishedDate" date,
        "employeeCount" integer,
        "licenseNumber" varchar(20),
        "contractTerms" jsonb,
        "performanceMetrics" jsonb,
        "settings" jsonb,
        "notes" text,
        "isActive" boolean DEFAULT true,
        "suspendedAt" timestamp,
        "suspensionReason" text,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "email" varchar(255) UNIQUE NOT NULL,
        "password" varchar(255) NOT NULL,
        "role" user_role DEFAULT 'operator',
        "phoneNumber" varchar(20),
        "isActive" boolean DEFAULT true,
        "lastLoginAt" timestamp,
        "lastLoginIp" varchar(45),
        "failedLoginAttempts" integer DEFAULT 0,
        "lockedUntil" timestamp,
        "companyId" uuid REFERENCES companies(id),
        "preferences" jsonb,
        "refreshTokens" text[] DEFAULT '{}',
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create sales_accounts table
    await queryRunner.query(`
      CREATE TABLE "sales_accounts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "accountCode" varchar(20) UNIQUE NOT NULL,
        "companyName" varchar(255) NOT NULL,
        "contactPerson" varchar(100) NOT NULL,
        "email" varchar(255) NOT NULL,
        "phoneNumber" varchar(20) NOT NULL,
        "mobileNumber" varchar(20),
        "areas" text[] DEFAULT '{}',
        "propertyTypes" text[] DEFAULT '{}',
        "status" account_status DEFAULT 'active',
        "companyId" uuid NOT NULL REFERENCES companies(id),
        "performanceMetrics" jsonb,
        "availability" jsonb,
        "preferences" jsonb,
        "bankInfo" jsonb,
        "commissionRate" decimal(5,2) DEFAULT 10.0,
        "notes" text,
        "isActive" boolean DEFAULT true,
        "lastAssignedAt" timestamp,
        "priorityScore" integer DEFAULT 0,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create cases table with sequence for case number
    await queryRunner.query(`CREATE SEQUENCE case_number_seq START 10000`);
    
    await queryRunner.query(`
      CREATE TABLE "cases" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "caseNumber" varchar(20) UNIQUE NOT NULL DEFAULT 'C' || nextval('case_number_seq'),
        "customerName" varchar(100) NOT NULL,
        "phoneNumber" varchar(20) NOT NULL,
        "email" varchar(255),
        "address" jsonb NOT NULL,
        "propertyType" property_type DEFAULT 'house',
        "propertyArea" integer,
        "propertyAge" integer,
        "propertyFloors" varchar(50),
        "budget" varchar(100),
        "urgency" urgency DEFAULT 'normal',
        "status" case_status DEFAULT 'pending_assignment',
        "statusHistory" jsonb DEFAULT '[]',
        "assignedCompanyId" uuid REFERENCES companies(id),
        "salesAccountId" uuid REFERENCES sales_accounts(id),
        "assignedAt" timestamp,
        "assignmentMethod" varchar(50) DEFAULT 'manual',
        "reassignmentHistory" jsonb DEFAULT '[]',
        "contactLog" jsonb DEFAULT '[]',
        "hearingInfo" jsonb,
        "estimateInfo" jsonb,
        "contractInfo" jsonb,
        "notes" text,
        "internalNotes" text,
        "tags" text[] DEFAULT '{}',
        "files" jsonb,
        "createdById" uuid NOT NULL REFERENCES users(id),
        "metrics" jsonb,
        "source" varchar(50),
        "referralSource" varchar(100),
        "version" integer DEFAULT 0,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create invoices table with sequence for invoice number
    await queryRunner.query(`CREATE SEQUENCE invoice_number_seq START 1000`);
    
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "invoiceNumber" varchar(20) UNIQUE NOT NULL DEFAULT 'INV' || to_char(now(), 'YYYYMM') || lpad(nextval('invoice_number_seq')::text, 4, '0'),
        "companyId" uuid NOT NULL REFERENCES companies(id),
        "billingMonth" varchar(7) NOT NULL,
        "items" jsonb DEFAULT '[]',
        "subtotal" decimal(10,0) NOT NULL,
        "tax" decimal(10,0) NOT NULL,
        "adjustmentAmount" decimal(10,0) DEFAULT 0,
        "adjustmentReason" text,
        "total" decimal(10,0) NOT NULL,
        "status" invoice_status DEFAULT 'draft',
        "dueDate" timestamp NOT NULL,
        "issuedAt" timestamp,
        "sentAt" timestamp,
        "paidAt" timestamp,
        "paidAmount" decimal(10,0) DEFAULT 0,
        "payments" jsonb DEFAULT '[]',
        "reminder" jsonb,
        "notes" text,
        "internalNotes" text,
        "billingDetails" jsonb,
        "pdfUrl" varchar(255),
        "pdfGeneratedAt" timestamp,
        "isLocked" boolean DEFAULT false,
        "lockedAt" timestamp,
        "lockedBy" uuid,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create deposits table
    await queryRunner.query(`
      CREATE TABLE "deposits" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL REFERENCES companies(id),
        "invoiceId" uuid REFERENCES invoices(id),
        "amount" decimal(10,0) NOT NULL,
        "depositDate" date NOT NULL,
        "paymentMethod" payment_method DEFAULT 'bank_transfer',
        "referenceNumber" varchar(255),
        "bankDetails" jsonb,
        "status" deposit_status DEFAULT 'pending',
        "confirmedAt" timestamp,
        "confirmedBy" uuid,
        "notes" text,
        "rejectionReason" text,
        "reconciliation" jsonb,
        "refundInfo" jsonb,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create cancel_requests table
    await queryRunner.query(`
      CREATE TABLE "cancel_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "caseId" uuid NOT NULL REFERENCES cases(id),
        "reason" cancel_reason DEFAULT 'other',
        "description" text NOT NULL,
        "status" cancel_request_status DEFAULT 'pending',
        "requestedBy" uuid NOT NULL,
        "requestedByRole" varchar(50) NOT NULL,
        "requestedAt" timestamp NOT NULL,
        "processedBy" uuid REFERENCES users(id),
        "processedAt" timestamp,
        "processNotes" text,
        "rejectionReason" text,
        "customerInfo" jsonb,
        "financialImpact" jsonb,
        "customerNotified" boolean DEFAULT false,
        "customerNotifiedAt" timestamp,
        "companyNotified" boolean DEFAULT false,
        "companyNotifiedAt" timestamp,
        "communicationLog" jsonb DEFAULT '[]',
        "priority" integer DEFAULT 0,
        "deadline" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "type" notification_type DEFAULT 'custom',
        "channel" notification_channel NOT NULL,
        "recipient" varchar(255) NOT NULL,
        "recipientName" varchar(255),
        "subject" varchar(255),
        "message" text NOT NULL,
        "templateData" jsonb,
        "templateId" varchar(100),
        "status" notification_status DEFAULT 'pending',
        "caseId" uuid REFERENCES cases(id),
        "externalId" varchar(255),
        "providerResponse" jsonb,
        "metadata" jsonb,
        "scheduledFor" timestamp,
        "sentAt" timestamp,
        "deliveredAt" timestamp,
        "readAt" timestamp,
        "failedAt" timestamp,
        "errorMessage" text,
        "deliveryAttempts" jsonb DEFAULT '[]',
        "tracking" jsonb,
        "requiresConfirmation" boolean DEFAULT false,
        "confirmed" boolean DEFAULT false,
        "confirmedAt" timestamp,
        "confirmationCode" text,
        "expiresAt" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX idx_companies_status_type ON companies(status, type)`);
    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email)`);
    await queryRunner.query(`CREATE INDEX idx_users_company_active ON users("companyId", "isActive")`);
    await queryRunner.query(`CREATE INDEX idx_sales_accounts_company_status ON sales_accounts("companyId", status)`);
    await queryRunner.query(`CREATE INDEX idx_cases_status_company ON cases(status, "assignedCompanyId")`);
    await queryRunner.query(`CREATE INDEX idx_cases_created_status ON cases("createdAt", status)`);
    await queryRunner.query(`CREATE INDEX idx_invoices_company_month ON invoices("companyId", "billingMonth")`);
    await queryRunner.query(`CREATE INDEX idx_invoices_status_due ON invoices(status, "dueDate")`);
    await queryRunner.query(`CREATE INDEX idx_deposits_company_date ON deposits("companyId", "depositDate")`);
    await queryRunner.query(`CREATE INDEX idx_cancel_requests_case_status ON cancel_requests("caseId", status)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_recipient_status ON notifications(recipient, status)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_case_type ON notifications("caseId", type)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_scheduled ON notifications("scheduledFor", status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cancel_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deposits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);

    // Drop sequences
    await queryRunner.query(`DROP SEQUENCE IF EXISTS invoice_number_seq`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS case_number_seq`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cancel_reason"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cancel_request_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "deposit_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "account_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "company_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "company_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "urgency"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "property_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "case_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role"`);
  }
}