# Excel File Sample

Create an Excel file with these exact column headers:

| Company Name | Company Email | Invoice No. | Invoice Date | Due Days | Bill Amount | Pending Amount | Balance Amount |
|-------------|---------------|-------------|--------------|----------|-------------|----------------|----------------|
| ABP INDUCTION PVT. LTD. | Pragneshkumar.Prajapati@abp365.onmicrosoft.com | N/817/25-26 | 27-05-2025 | 257 | 290.00 DB | 161.00 DB | 161.00 DB |
| ABP INDUCTION PVT. LTD. | Pragneshkumar.Prajapati@abp365.onmicrosoft.com | N/2620/25-26 | 31-10-2025 | 100 | 129.00 DB | 129.00 DB | 903.00 CR |
| ABP INDUCTION PVT. LTD. | Pragneshkumar.Prajapati@abp365.onmicrosoft.com | N/3466/25-26 | 03-01-2026 | 36 | 121.00 DB | 121.00 DB | 782.00 CR |

## Column Explanations

- **Company Name**: Name of the company
- **Company Email**: Email address where reminders will be sent
- **Invoice No.**: Unique invoice identifier
- **Invoice Date**: Date when invoice was created
- **Due Days**: Number of days until due (0 = due today, negative = overdue)
- **Bill Amount**: Total bill amount with DB (Debit) or CR (Credit) postfix
- **Pending Amount**: Pending amount with DB or CR postfix
- **Balance Amount**: Balance amount with DB or CR postfix

## Amount Format

Amounts include a **DB** (Debit) or **CR** (Credit) postfix, e.g.:
- `290.00 DB` — Debit amount
- `1,193.00 CR` — Credit amount

These are stored as text strings, not numbers.

## Due Days Logic

- **Positive (e.g., 2, 5, 10)**: Days remaining before due
- **0**: Due today
- **Negative (e.g., -1, -2)**: Days overdue

When you click "Send Email Reminders", the system will send all invoices with Due Days ≤ 0 (overdue and due today).
