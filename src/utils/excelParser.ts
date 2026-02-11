import * as XLSX from 'xlsx'
import { Invoice } from '../types'

// Convert Excel serial date to readable date string
const excelDateToString = (serial: any): string => {
  if (!serial) return ''
  
  // If it's already a string, return it
  if (typeof serial === 'string') return serial
  
  // If it's a number (Excel serial date)
  if (typeof serial === 'number') {
    const utcDays = Math.floor(serial - 25569)
    const utcValue = utcDays * 86400
    const dateInfo = new Date(utcValue * 1000)
    
    const day = String(dateInfo.getUTCDate()).padStart(2, '0')
    const month = String(dateInfo.getUTCMonth() + 1).padStart(2, '0')
    const year = String(dateInfo.getUTCFullYear()).slice(-2)
    
    return `${day}-${month}-${year}`
  }
  
  return String(serial)
}

// Read amount as string preserving DB/CR postfix
const readAmount = (value: any): string => {
  if (!value && value !== 0) return ''
  return String(value).trim()
}

export const parseExcelFile = (file: File): Promise<Invoice[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: false })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        const invoices: Invoice[] = jsonData.map((row: any, index) => {
          return {
            id: `INV-${Date.now()}-${index}`,
            companyName: row['Company Name'] || row['CompanyName'] || '',
            companyEmail: row['Company Email'] || row['CompanyEmail'] || '',
            invoiceNo: row['Invoice No.'] || row['Invoice No'] || row['InvoiceNo'] || '',
            invoiceDate: excelDateToString(row['Invoice Date'] || row['InvoiceDate']),
            dueDays: parseInt(row['Due Days'] || row['DueDays'] || '0') || 0,
            billAmount: readAmount(row['Bill Amount'] || row['BillAmount']),
            pendingAmount: readAmount(row['Pending Amount'] || row['PendingAmount']),
            balanceAmount: readAmount(row['Balance Amount'] || row['BalanceAmount']),
            excluded: false,
          }
        })

        resolve(invoices)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}
