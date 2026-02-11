# Bill Reminder System

React + TypeScript app for tracking invoice due dates and sending automated email reminders with cloud database storage.

## Features

- ✅ **Supabase Integration** - Cloud database for persistent storage
- ✅ **Sidebar Navigation** - Dashboard, Email History, Auto Reminders pages
- ✅ Upload Excel with columns: Company Name, Company Email, Invoice No., Invoice Date, Due Days, Bill Amount, Pending Amount, Balance Amount
- ✅ **Fixed Date Display**: Excel dates show correctly (28-01-26 instead of 46050)
- ✅ **Filters**: Filter by company name and status (All, Overdue, Due Today, Active)
- ✅ Track overdue invoices (Due Days ≤ 0)
- ✅ Edit, delete, and exclude invoices
- ✅ **Send bulk emails** to all overdue companies
- ✅ **Send instant email** to individual companies or invoices
- ✅ **7-Day Auto-Reminder Cycle** - Automatic reminders every 7 days
- ✅ Email history tracking with next reminder schedule
- ✅ Pause/Resume auto-reminders per company

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Supabase
Follow the complete guide in [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

**Quick steps:**
1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Copy `.env.example` to `.env` and add your credentials
4. Run the SQL schema from [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

### 3. Run Development Server
```bash
npm run dev
```

Open http://localhost:5173

## Excel Format

| Company Name | Company Email | Invoice No. | Invoice Date | Due Days | Bill Amount | Pending Amount | Balance Amount |
|-------------|---------------|-------------|--------------|----------|-------------|----------------|----------------|
| Sentiment AI | email@test.com | INV-001 | 28-01-26 | 2 | 2000 | 1000 | 2000 |

**Note**: Excel stores dates as serial numbers (46050, 46051, etc.). The app automatically converts them to readable format (28-01-26, 29-01-26).

## How It Works

1. **Upload Excel** - Dates are automatically converted from Excel serial format and saved to Supabase
2. **Navigate Pages** - Use sidebar to access Dashboard, Email History, and Auto Reminders
3. **Filter Invoices** - Use company search or status filters
4. **Manage Invoices** - Edit, delete, or exclude invoices from reminders
5. **Send Emails**:
   - **Bulk Send**: Click "Send Email Reminders" to send to all overdue companies
   - **Company Send**: Click "Send Now" on company card to send all invoices for that company
   - **Individual Send**: Click "Send" next to any invoice
6. **Auto-Reminders**: System automatically sends reminders every 7 days for overdue invoices
7. **Control Reminders**: Pause/Resume auto-reminders per company

## Database Storage

All data is stored in Supabase (PostgreSQL):
- **invoices** table - All invoice records with real-time sync
- **email_logs** table - Email history and reminder schedules

No data is stored in browser localStorage - everything persists in the cloud!
1. Push your code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

```bash
npm run build
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Routing**: React Router v6
- **HTTP**: Axios
- **Excel**: XLSX library
- **Styling**: CSS
- **Webhooks**: n8n for email automation
  - All Invoices: Show everything
  - Overdue Only: Due Days ≤ 0
  - Due Today: Due Days = 0
  - Active (Future): Due Days > 0

## Deploy to Vercel

```bash
npm run build
```

Upload the `dist` folder to Vercel or connect your GitHub repo.