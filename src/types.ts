export interface Invoice {
  id: string
  companyName: string
  companyEmail: string
  invoiceNo: string
  invoiceDate: string
  dueDays: number
  billAmount: number
  pendingAmount: number
  balanceAmount: number
  excluded: boolean
}

export interface EmailLog {
  company: string
  lastSent: string
  invoiceCount: number
  nextReminderDate?: string
  remindersPaused?: boolean
}
