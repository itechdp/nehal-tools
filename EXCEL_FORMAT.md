# Excel File Sample

Create an Excel file with these exact column headers:

| Party GSTIN No. | Party Name | Party E-Mail | Bill Date | Bill No | Due Days | GST Assessable Amount | State/UT Tax Amount | Central Tax Amount | Integrated Tax Amount | Bill Amount |
|-----------------|------------|--------------|-----------|---------|----------|----------------------|---------------------|--------------------|-----------------------|-------------|
| 24HZVPP8161A1ZX | Sentiment AI | sentimenta.ai@gmail.com | 07-02-26 | SmAl/PI/Jan/2026 | 2 | 232.34 | 20.9 | 20.9 | 0 | 274 |
| 24HZVPP8161A1ZX | Sentiment AI | sentimenta.ai@gmail.com | 08-02-26 | SmAl/PI/Jan/2027 | 3 | 540 | 48.6 | 48.6 | 0 | 637 |

## Column Explanations

- **Party GSTIN No.**: GST Identification Number of the party
- **Party Name**: Name of the party/company
- **Party E-Mail**: Email address where reminders will be sent
- **Bill Date**: Date when bill was created
- **Bill No**: Unique bill identifier
- **Due Days**: Number of days until due (0 = due today, negative = overdue)
- **GST Assessable Amount**: Taxable amount before GST
- **State/UT Tax Amount**: State or UT tax amount (SGST/UTGST)
- **Central Tax Amount**: Central tax amount (CGST)
- **Integrated Tax Amount**: Integrated tax amount (IGST)
- **Bill Amount**: Total bill amount including taxes

## Due Days Logic

- **Positive (e.g., 2, 5, 10)**: Days remaining before due
- **0**: Due today
- **Negative (e.g., -1, -2)**: Days overdue

When you click "Send Email Reminders", the system will send all invoices with Due Days ≤ 0 (overdue and due today).
