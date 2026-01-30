# Bill Reminder System

Simple React + TypeScript app for tracking invoice due dates and sending automated email reminders.

## Features

- ✅ Upload Excel with exact columns: Company Name, Company Email, Invoice No., Invoice Date, Due Days, Bill Amount, Pending Amount, Balance Amount
- ✅ **Fixed Date Display**: Excel dates now show correctly (28-01-26 instead of 46050)
- ✅ **Filters**: Filter by company name and status (All, Overdue, Due Today, Active)
- ✅ Track overdue invoices (Due Days ≤ 0)
- ✅ Checkbox to exclude companies from emails
- ✅ **Send bulk emails** to all overdue companies
- ✅ **Send instant email** to individual companies
- ✅ Email history tracking with timestamps

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Excel Format

| Company Name | Company Email | Invoice No. | Invoice Date | Due Days | Bill Amount | Pending Amount | Balance Amount |
|-------------|---------------|-------------|--------------|----------|-------------|----------------|----------------|
| Sentiment AI | email@test.com | INV-001 | 28-01-26 | 2 | 2000 | 1000 | 2000 |

**Note**: Excel stores dates as serial numbers (46050, 46051, etc.). The app automatically converts them to readable format (28-01-26, 29-01-26).

## How It Works

1. **Upload Excel** - Dates are automatically converted from Excel serial format
2. **Filter Invoices** - Use company search or status filters
3. **Send Emails**:
   - **Bulk Send**: Click "Send Email Reminders" to send to all overdue companies
   - **Individual Send**: Click "Send Email" next to any company to send instantly
4. Emails sent to n8n webhook with all invoice details

## Filters

- **Company Name**: Search/filter by company name
- **Status**:
  - All Invoices: Show everything
  - Overdue Only: Due Days ≤ 0
  - Due Today: Due Days = 0
  - Active (Future): Due Days > 0

## Deploy to Vercel

```bash
npm run build
```

Upload the `dist` folder to Vercel or connect your GitHub repo.