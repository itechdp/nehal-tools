# Supabase Database Setup

## 📋 Step-by-Step Setup Instructions

### 1. Create a Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Wait for the project to be provisioned (~2 minutes)

### 2. Get Your API Credentials
1. Go to **Project Settings** → **API**
2. Copy your:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public** key (starts with `eyJ...`)

### 3. Configure Environment Variables
1. Create a `.env` file in the project root (copy from `.env.example`)
2. Add your credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the SQL Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Create a **New query**
3. Copy and paste the SQL schema below
4. Click **Run** to execute

---

## 🗃️ SQL Schema

```sql
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
```

---

## ✅ Verify the Setup

After running the SQL, verify the tables were created:

1. Go to **Table Editor** in Supabase
2. You should see two tables:
   - `invoices`
   - `email_logs`

---

## 🔐 Security Notes

### Current Setup (Development)
- **Public access enabled** - Anyone with the anon key can read/write
- Perfect for development and testing
- No authentication required

### For Production (Recommended)
1. **Add Authentication**:
   - Enable Supabase Auth
   - Add user login/signup
   - Implement user-specific data access

2. **Update RLS Policies**:
   ```sql
   -- Remove public policies
   DROP POLICY "Allow public read access" ON invoices;
   -- etc.
   
   -- Add user-specific policies
   CREATE POLICY "Users can only see their own invoices" ON invoices
     FOR SELECT USING (auth.uid() = user_id);
   ```

3. **Add user_id column**:
   ```sql
   ALTER TABLE invoices ADD COLUMN user_id UUID REFERENCES auth.users(id);
   ALTER TABLE email_logs ADD COLUMN user_id UUID REFERENCES auth.users(id);
   ```

---

## 📊 Test Queries (Optional)

Test your setup with these queries:

```sql
-- Check invoices table
SELECT COUNT(*) FROM invoices;

-- Check email logs table
SELECT COUNT(*) FROM email_logs;

-- View recent invoices
SELECT * FROM invoices ORDER BY created_at DESC LIMIT 10;

-- View email logs
SELECT * FROM email_logs ORDER BY last_sent DESC;
```

---

## 🚀 Next Steps

1. ✅ Create `.env` file with your credentials
2. ✅ Run the SQL schema in Supabase
3. ✅ Restart your dev server: `npm run dev`
4. ✅ Upload an Excel file to test database sync
5. 🎉 Your data is now stored in Supabase!

---

## 🔄 Migration from localStorage

Your existing localStorage data won't automatically migrate. To keep your current data:

1. Before updating, export your data from browser console:
   ```javascript
   console.log(JSON.stringify(localStorage.getItem('invoices')))
   console.log(JSON.stringify(localStorage.getItem('emailLogs')))
   ```

2. After Supabase setup, you can manually insert this data or simply re-upload your Excel file.

---

## 📞 Support

If you encounter issues:
- Check the browser console for errors
- Verify your `.env` credentials
- Ensure RLS policies are correctly set
- Check Supabase logs in the dashboard
