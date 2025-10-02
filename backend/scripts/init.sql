-- Initial database setup for Franchise Dashboard

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE case_status AS ENUM (
  'pending_assignment',    -- 未割当
  'assigned',             -- 割当済
  'contact_pending',      -- 連絡待ち
  'hearing_scheduled',    -- ヒアリング日程確定
  'hearing_complete',     -- ヒアリング済み
  'estimate_requested',   -- 見積依頼済
  'estimate_received',    -- 見積回収
  'estimate_submitted',   -- 見積提出済
  'contract_pending',     -- 成約待ち
  'contracted'           -- 成約
);

CREATE TYPE notification_channel AS ENUM ('SMS', 'LINE', 'EMAIL');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator');

-- Create schema
CREATE SCHEMA IF NOT EXISTS franchise;

-- Grant permissions
GRANT ALL ON SCHEMA franchise TO franchise;
GRANT ALL ON ALL TABLES IN SCHEMA franchise TO franchise;
GRANT ALL ON ALL SEQUENCES IN SCHEMA franchise TO franchise;