-- ============================================
-- Bill Reminder System Database Schema
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Invoices Table
-- ============================================
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  "companyName" TEXT NOT NULL,
  "companyEmail" TEXT NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "invoiceDate" TEXT NOT NULL,
  "dueDays" INTEGER NOT NULL,
  "billAmount" TEXT NOT NULL,
  "pendingAmount" TEXT NOT NULL,
  "balanceAmount" TEXT NOT NULL,
  excluded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_invoices_company_name ON invoices("companyName");
CREATE INDEX idx_invoices_due_days ON invoices("dueDays");
CREATE INDEX idx_invoices_excluded ON invoices(excluded);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- ============================================
-- Email Logs Table
-- ============================================
CREATE TABLE email_logs (
  company TEXT PRIMARY KEY,
  "lastSent" TEXT NOT NULL,
  "invoiceCount" INTEGER NOT NULL,
  "nextReminderDate" TEXT,
  "remindersPaused" BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_email_logs_next_reminder ON email_logs("nextReminderDate");
CREATE INDEX idx_email_logs_paused ON email_logs("remindersPaused");

-- ============================================
-- Auto-update timestamp trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to invoices table
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to email_logs table
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on both tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
-- (You can make this more restrictive based on your needs)
CREATE POLICY "Allow all for authenticated users" ON invoices
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON email_logs
  FOR ALL USING (true);

-- Allow public access (since you're not using auth yet)
-- Comment these out if you add authentication later
CREATE POLICY "Allow public read access" ON invoices
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON invoices
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON invoices
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON email_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON email_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON email_logs
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON email_logs
  FOR DELETE USING (true);
