export interface Invoice {
  id: string
  partyGSTIN: string
  partyName: string
  partyEmail: string
  billNo: string
  billDate: string
  dueDays: number
  gstAssessableAmount: number
  stateUTTaxAmount: number
  centralTaxAmount: number
  integratedTaxAmount: number
  billAmount: number
  excluded: boolean
}

export interface EmailLog {
  company: string
  lastSent: string
  invoiceCount: number
  nextReminderDate?: string
  remindersPaused?: boolean
}
