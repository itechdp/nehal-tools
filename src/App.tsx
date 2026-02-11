import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Invoice, EmailLog } from './types'
import { parseExcelFile } from './utils/excelParser'
import { sendToWebhook } from './utils/webhook'
import { invoiceService, emailLogService } from './services/database'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import EmailHistory from './pages/EmailHistory'
import AutoReminders from './pages/AutoReminders'
import './App.css'

function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sendingCompany, setSendingCompany] = useState<string | null>(null)
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Check for auto-reminders every minute
  useEffect(() => {
    const checkReminders = setInterval(() => {
      checkAndSendAutoReminders()
    }, 60000) // Check every minute

    return () => clearInterval(checkReminders)
  }, [invoices, emailLogs])

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const [invoicesData, logsData] = await Promise.all([
        invoiceService.getAllInvoices(),
        emailLogService.getAllLogs()
      ])
      setInvoices(invoicesData)
      setEmailLogs(logsData)
      setLoading(false)
    }
    loadData()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage('')

    try {
      const parsed = await parseExcelFile(file)
      if (parsed.length === 0) {
        setMessage('[ERROR] No data found in Excel file')
        setLoading(false)
        return
      }
      
      // Save to Supabase
      const savedInvoices = await invoiceService.addInvoices(parsed)
      setInvoices(savedInvoices)
      setMessage(`[SUCCESS] Excel uploaded successfully! ${savedInvoices.length} invoices saved to database`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Parse error:', error)
      setMessage('[ERROR] Error reading Excel file. Check the format and column names.')
    }
    
    setLoading(false)
  }

  const toggleReminderPause = async (partyName: string) => {
    const log = emailLogs.find(l => l.company === partyName)
    const isPaused = !log?.remindersPaused
    
    const updatedLog = {
      ...log,
      company: partyName,
      remindersPaused: isPaused
    } as EmailLog
    
    await emailLogService.upsertLog(updatedLog)
    
    setEmailLogs(prev => prev.map(l => 
      l.company === partyName ? updatedLog : l
    ))
  }

  const checkAndSendAutoReminders = async () => {
    const now = new Date()
    
    // Get companies with overdue invoices
    const overdueByCompany: Record<string, Invoice[]> = {}
    invoices.filter(inv => inv.dueDays <= 0 && !inv.excluded).forEach(inv => {
      if (!overdueByCompany[inv.companyName]) {
        overdueByCompany[inv.companyName] = []
      }
      overdueByCompany[inv.companyName].push(inv)
    })

    for (const [company, companyInvoices] of Object.entries(overdueByCompany)) {
      const log = emailLogs.find(l => l.company === company)
      
      // Skip if reminders are paused
      if (log?.remindersPaused) continue
      
      // Check if 7 days have passed since last reminder
      if (log?.nextReminderDate) {
        const nextDate = new Date(log.nextReminderDate)
        if (now >= nextDate) {
          console.log(`[AUTO-REMINDER] Sending 7-day reminder to ${company}`)
          await sendAutoReminder(company, companyInvoices)
        }
      } else if (!log) {
        // First time - send immediately
        console.log(`[FIRST-REMINDER] First reminder to ${company}`)
        await sendAutoReminder(company, companyInvoices)
      }
    }
  }

  const sendAutoReminder = async (partyName: string, companyInvoices: Invoice[]) => {
    const payload = {
      type: 'auto_reminder_7day',
      company: partyName,
      email: companyInvoices[0].companyEmail,
      invoiceCount: companyInvoices.length,
      invoices: companyInvoices.map(inv => ({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        billAmount: inv.billAmount,
        pendingAmount: inv.pendingAmount,
        balanceAmount: inv.balanceAmount,
        daysOverdue: Math.abs(inv.dueDays)
      })),
      triggeredAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      isAutomatic: true
    }

    const result = await sendToWebhook(payload)
    
    if (result.success) {
      const now = new Date()
      const nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const newLog: EmailLog = {
        company: partyName,
        lastSent: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        invoiceCount: companyInvoices.length,
        nextReminderDate: nextReminder.toISOString(),
        remindersPaused: false
      }
      
      await emailLogService.upsertLog(newLog)
      
      setEmailLogs(prev => {
        const filtered = prev.filter(log => log.company !== partyName)
        return [...filtered, newLog]
      })
    }
  }

  const sendSingleInvoiceEmail = async (invoice: Invoice) => {
    setSendingInvoice(invoice.id)
    console.log(`[SINGLE] Sending invoice email for ${invoice.invoiceNo}`)
    
    const payload = {
      type: 'single_invoice',
      company: invoice.companyName,
      email: invoice.companyEmail,
      invoiceCount: 1,
      invoices: [{
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.invoiceDate,
        billAmount: invoice.billAmount,
        pendingAmount: invoice.pendingAmount,
        balanceAmount: invoice.balanceAmount,
        dueDays: invoice.dueDays
      }],
      triggeredAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }

    const result = await sendToWebhook(payload)
    
    if (result.success) {
      const now = new Date()
      const nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const newLog: EmailLog = {
        company: invoice.companyName,
        lastSent: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        invoiceCount: 1,
        nextReminderDate: nextReminder.toISOString(),
        remindersPaused: false
      }
      
      await emailLogService.upsertLog(newLog)
      
      setEmailLogs(prev => {
        const filtered = prev.filter(log => log.company !== invoice.companyName)
        return [...filtered, newLog]
      })
      setMessage(`[SUCCESS] Email sent for invoice ${invoice.invoiceNo} to ${invoice.companyEmail}`)
    } else {
      setMessage(`[ERROR] Failed to send email for invoice ${invoice.invoiceNo}`)
    }
    
    setSendingInvoice(null)
    setTimeout(() => setMessage(''), 3000)
  }

  const sendEmails = async () => {
    setLoading(true)
    console.log('[BULK] Sending OVERDUE emails to all companies')
    
    // Filter invoices where Due Days <= 0 (overdue) and not excluded
    const overdue = invoices.filter(inv => inv.dueDays <= 0 && !inv.excluded)
    
    if (overdue.length === 0) {
      setMessage('No overdue invoices to send.')
      setLoading(false)
      return
    }

    console.log(`Found ${overdue.length} overdue invoices`)

    // Group by company
    const grouped: Record<string, Invoice[]> = {}
    overdue.forEach(inv => {
      if (!grouped[inv.companyName]) {
        grouped[inv.companyName] = []
      }
      grouped[inv.companyName].push(inv)
    })

    let successCount = 0

    for (const [company, companyInvoices] of Object.entries(grouped)) {
      console.log(`Sending to ${company} - ${companyInvoices.length} invoice(s)`)
      
      const payload = {
        type: 'bulk_overdue',
        company: company,
        email: companyInvoices[0].companyEmail,
        invoiceCount: companyInvoices.length,
        invoices: companyInvoices.map(inv => ({
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          billAmount: inv.billAmount,
          pendingAmount: inv.pendingAmount,
          balanceAmount: inv.balanceAmount,
          daysOverdue: Math.abs(inv.dueDays)
        })),
        triggeredAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      }

      const result = await sendToWebhook(payload)
      
      if (result.success) {
        successCount++
        const now = new Date()
        const nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        
        const newLog: EmailLog = {
          company,
          lastSent: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          invoiceCount: companyInvoices.length,
          nextReminderDate: nextReminder.toISOString(),
          remindersPaused: false
        }
        
        await emailLogService.upsertLog(newLog)
        
        setEmailLogs(prev => {
          const filtered = prev.filter(log => log.company !== company)
          return [...filtered, newLog]
        })
      }
    }

    setMessage(`[SUCCESS] Sent ${successCount} emails successfully!`)
    setLoading(false)
    setTimeout(() => setMessage(''), 5000)
  }

  const sendCompanyEmail = async (partyName: string) => {
    setSendingCompany(partyName)
    console.log(`[COMPANY] Sending email to ${partyName}`)
    
    const companyInvoices = invoices.filter(inv => inv.companyName === partyName && !inv.excluded)
    
    if (companyInvoices.length === 0) {
      setMessage('No invoices to send for this company.')
      setSendingCompany(null)
      return
    }

    const payload = {
      type: 'company_bulk',
      company: partyName,
      email: companyInvoices[0].companyEmail,
      invoiceCount: companyInvoices.length,
      invoices: companyInvoices.map(inv => ({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        billAmount: inv.billAmount,
        pendingAmount: inv.pendingAmount,
        balanceAmount: inv.balanceAmount,
        dueDays: inv.dueDays
      })),
      triggeredAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }

    const result = await sendToWebhook(payload)
    
    if (result.success) {
      const now = new Date()
      const nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const newLog: EmailLog = {
        company: partyName,
        lastSent: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        invoiceCount: companyInvoices.length,
        nextReminderDate: nextReminder.toISOString(),
        remindersPaused: false
      }
      
      await emailLogService.upsertLog(newLog)
      
      setEmailLogs(prev => {
        const filtered = prev.filter(log => log.company !== partyName)
        return [...filtered, newLog]
      })
      setMessage(`[SUCCESS] Email sent to ${partyName} with ${companyInvoices.length} invoice(s)`)
    } else {
      setMessage(`[ERROR] Failed to send email to ${partyName}`)
    }
    
    setSendingCompany(null)
    setTimeout(() => setMessage(''), 3000)
  }

  const overdueCount = invoices.filter(inv => inv.dueDays <= 0 && !inv.excluded).length
  const dueTodayCount = invoices.filter(inv => inv.dueDays === 0 && !inv.excluded).length
  const excludedCount = invoices.filter(inv => inv.excluded).length

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        
        <div style={{ marginLeft: '260px', flex: 1, background: '#f5f7fa' }}>
          <div className="container">
            <div className="header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1>Bill Reminder System</h1>
                  <p>Upload Excel, track overdue invoices, and send automated reminders</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4285f4' }}>
                    {currentTime.toLocaleTimeString('en-IN', { 
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {currentTime.toLocaleDateString('en-IN', { 
                      timeZone: 'Asia/Kolkata',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })} • IST
                  </div>
                </div>
              </div>
            </div>

            <div className="upload-section">
              <h2>Upload Excel File</h2>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="file-input"
                disabled={loading}
              />
              <p style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
                Columns: Company Name, Company Email, Invoice No., Invoice Date, Due Days, Bill Amount, Pending Amount, Balance Amount
              </p>
            </div>

            {message && (
              <div className={`message ${message.includes('[ERROR]') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}

            {invoices.length === 0 && !loading && (
              <div className="empty-state">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3>No Invoices Yet</h3>
                <p>Upload an Excel file to get started</p>
              </div>
            )}

            {invoices.length > 0 && (
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <Dashboard 
                      invoices={invoices}
                      setInvoices={setInvoices}
                      loading={loading}
                      setMessage={setMessage}
                      sendEmails={sendEmails}
                      sendSingleInvoiceEmail={sendSingleInvoiceEmail}
                      sendingInvoice={sendingInvoice}
                      overdueCount={overdueCount}
                      dueTodayCount={dueTodayCount}
                      excludedCount={excludedCount}
                    />
                  } 
                />
                <Route 
                  path="/email-history" 
                  element={<EmailHistory emailLogs={emailLogs} />} 
                />
                <Route 
                  path="/auto-reminders" 
                  element={
                    <AutoReminders 
                      invoices={invoices}
                      emailLogs={emailLogs}
                      currentTime={currentTime}
                      sendCompanyEmail={sendCompanyEmail}
                      toggleReminderPause={toggleReminderPause}
                      sendingCompany={sendingCompany}
                    />
                  } 
                />
              </Routes>
            )}
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App
