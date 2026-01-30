# Excel File Sample

Create an Excel file with these exact column headers:

| Company Name | Company Email | Invoice No. | Invoice Date | Due Days | Bill Amount | Pending Amount | Balance Amount |
|--------------|---------------|-------------|--------------|----------|-------------|----------------|----------------|
| Sentiment AI | sentimenta.ai@gmail.com | INV-001 | 28-01-26 | 2 | 2000 | 1000 | 2000 |
| Sentiment AI | sentimenta.ai@gmail.com | INV-002 | 29-01-26 | 2 | 2000 | 1500 | 3000 |
| Sentiment AI | sentimenta.ai@gmail.com | INV-003 | 30-01-26 | 2 | 3000 | 3000 | 6000 |
| Sentiment AI | sentimenta.ai@gmail.com | INV-004 | 31-01-26 | 2 | 2500 | 2500 | 8500 |

## Column Explanations

- **Company Name**: Name of the company
- **Company Email**: Email address where reminders will be sent
- **Invoice No.**: Unique invoice identifier
- **Invoice Date**: Date when invoice was created
- **Due Days**: Number of days until due (0 = due today, negative = overdue)
- **Bill Amount**: Original invoice amount
- **Pending Amount**: Current pending payment
- **Balance Amount**: Total balance owed

## Due Days Logic

- **Positive (e.g., 2, 5, 10)**: Days remaining before due
- **0**: Due today
- **Negative (e.g., -1, -2)**: Days overdue

When you click "Send Email Reminders", the system will send all invoices with Due Days ≤ 0 (overdue and due today).
