import { useState, useEffect } from 'react'
import { Invoice, EmailLog } from './types'
import { parseExcelFile } from './utils/excelParser'
import { sendToWebhook } from './utils/webhook'
import './App.css'

function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, overdue, due, active
  const [sendingCompany, setSendingCompany] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Invoice>>({})
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

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('invoices')
    const logs = localStorage.getItem('emailLogs')
    if (saved) setInvoices(JSON.parse(saved))
    if (logs) setEmailLogs(JSON.parse(logs))
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (invoices.length > 0) {
      localStorage.setItem('invoices', JSON.stringify(invoices))
    }
  }, [invoices])

  useEffect(() => {
    if (emailLogs.length > 0) {
      localStorage.setItem('emailLogs', JSON.stringify(emailLogs))
    }
  }, [emailLogs])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage('')

    try {
      const parsed = await parseExcelFile(file)
      if (parsed.length === 0) {
        setMessage('✗ No data found in Excel file')
        setLoading(false)
        return
      }
      setInvoices(parsed)
      setMessage(`✓ Excel uploaded successfully! ${parsed.length} invoices loaded.`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Parse error:', error)
      setMessage('✗ Error reading Excel file. Check the format and column names.')
    }
    setLoading(false)
  }

  const toggleExclude = (id: string) => {
    setInvoices(invoices.map(inv => 
      inv.id === id ? { ...inv, excluded: !inv.excluded } : inv
    ))
  }

  const toggleReminderPause = (partyName: string) => {
    setEmailLogs(prev => prev.map(log => 
      log.company === partyName 
        ? { ...log, remindersPaused: !log.remindersPaused }
        : log
    ))
    const log = emailLogs.find(l => l.company === partyName)
    const isPaused = !log?.remindersPaused
    setMessage(`${isPaused ? '⏸️ Paused' : '▶️ Resumed'} auto-reminders for ${partyName}`)
    setTimeout(() => setMessage(''), 2000)
  }

  const checkAndSendAutoReminders = async () => {
    const now = new Date()
    
    // Get companies with overdue invoices
    const overdueByCompany: Record<string, Invoice[]> = {}
    invoices.filter(inv => inv.dueDays <= 0 && !inv.excluded).forEach(inv => {
      if (!overdueByCompany[inv.partyName]) {
        overdueByCompany[inv.partyName] = []
      }
      overdueByCompany[inv.partyName].push(inv)
    })

    for (const [company, companyInvoices] of Object.entries(overdueByCompany)) {
      const log = emailLogs.find(l => l.company === company)
      
      // Skip if reminders are paused
      if (log?.remindersPaused) continue
      
      // Check if 7 days have passed since last reminder
      if (log?.nextReminderDate) {
        const nextDate = new Date(log.nextReminderDate)
        if (now >= nextDate) {
          console.log(`⏰ Auto-sending 7-day reminder to ${company}`)
          await sendAutoReminder(company, companyInvoices)
        }
      } else if (!log) {
        // First time - send immediately
        console.log(`🆕 First reminder to ${company}`)
        await sendAutoReminder(company, companyInvoices)
      }
    }
  }

  const sendAutoReminder = async (partyName: string, companyInvoices: Invoice[]) => {
    const total = companyInvoices.reduce((sum, inv) => sum + inv.billAmount, 0)
    
    const payload = {
      type: 'auto_reminder_7day',
      company: partyName,
      email: companyInvoices[0].partyEmail,
      totalAmount: total,
      invoiceCount: companyInvoices.length,
      invoices: companyInvoices.map(inv => ({
        billNo: inv.billNo,
        billDate: inv.billDate,
        billAmount: inv.billAmount,
        gstAssessableAmount: inv.gstAssessableAmount,
        stateUTTaxAmount: inv.stateUTTaxAmount,
        centralTaxAmount: inv.centralTaxAmount,
        integratedTaxAmount: inv.integratedTaxAmount,
        daysOverdue: Math.abs(inv.dueDays)
      })),
      triggeredAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      isAutomatic: true
    }

    const result = await sendToWebhook(payload)
    
    if (result.success) {
      const now = new Date()
      const nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      
      setEmailLogs(prev => {
        const filtered = prev.filter(log => log.company !== partyName)
        return [...filtered, {
          company: partyName,
          lastSent: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          invoiceCount: companyInvoices.length,
          nextReminderDate: nextReminder.toISOString(),
          remindersPaused: false
        }]
      })
    }
  }

  const deleteInvoice = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(inv => inv.id !== id))
      setMessage('✓ Invoice deleted successfully')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const startEdit = (invoice: Invoice) => {
    setEditingId(invoice.id)
    setEditData({ ...invoice })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const saveEdit = () => {
    if (!editingId) return
    
    setInvoices(invoices.map(inv => 
      inv.id === editingId ? { ...inv, ...editData } as Invoice : inv
    ))
    setMessage('✓ Invoice updated successfully')
    setTimeout(() => setMessage(''), 2000)
    setEditingId(null)
    setEditData({})
  }

  const sendSingleInvoiceEmail = async (invoice: Invoice) => {
    setSendingInvoice(invoice.id)
    console.log(`📧 Sending SINGLE invoice email for ${invoice.billNo}`)
    
    const payload = {
      type: 'single_invoice',
      company: invoice.partyName,
      email: invoice.partyEmail,
      totalAmount: invoice.billAmount,
      invoiceCount: 1,
      invoices: [{
        billNo: invoice.billNo,
        billDate: invoice.billDate,
        billAmount: invoice.billAmount,
        gstAssessableAmount: invoice.gstAssessableAmount,
        stateUTTaxAmount: invoice.stateUTTaxAmount,
        centralTaxAmount: invoice.centralTaxAmount,
        integratedTaxAmount: invoice.integratedTaxAmount,
        dueDays: invoice.dueDays
      }],
      triggeredAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }

    const result = await sendToWebhook(payload)
    
    if (result.success) {
      const now = new Date()
      const nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      
      setEmailLogs(prev => {
        const filtered = prev.filter(log => log.company !== invoice.partyName)
        return [...filtered, {
          company: invoice.partyName,
          lastSent: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          invoiceCount: 1,
          nextReminderDate: nextReminder.toISOString(),
          remindersPaused: false
        }]
      })
      setMessage(`✓ Email sent for bill ${invoice.billNo} to ${invoice.partyEmail}`)
    } else {
      setMessage(`✗ Failed to send email for bill ${invoice.billNo}`)
    }
    
    setSendingInvoice(null)
    setTimeout(() => setMessage(''), 3000)
  }

  const sendEmails = async () => {
    setLoading(true)
    console.log('📦 Sending BULK OVERDUE emails to all companies')
    
    // Filter invoices where Due Days <= 0 (overdue) and not excluded
    const overdue = invoices.filter(inv => inv.dueDays <= 0 && !inv.excluded)
    
    if (overdue.length === 0) {
      setMessage('No overdue invoices to send.')
      setLoading(false)
      return
    }

    console.log(`Found ${overdue.length} overdue invoices`)

    // Group by party
    const grouped: Record<string, Invoice[]> = {}
    overdue.forEach(inv => {
      if (!grouped[inv.partyName]) {
        grouped[inv.partyName] = []
      }
      grouped[inv.partyName].push(inv)
    })

    let successCount = 0

    for (const [company, companyInvoices] of Object.entries(grouped)) {
      console.log(`Sending to ${company} - ${companyInvoices.length} invoice(s)`)
      const total = companyInvoices.reduce((sum, inv) => sum + inv.billAmount, 0)
      
      const payload = {
        type: 'bulk_overdue',
        company: company,
        email: companyInvoices[0].partyEmail,
        totalAmount: total,
        invoiceCount: companyInvoices.length,
        invoices: companyInvoices.map(inv => ({
          billNo: inv.billNo,
          billDate: inv.billDate,
          billAmount: inv.billAmount,
          gstAssessableAmount: inv.gstAssessableAmount,
          stateUTTaxAmount: inv.stateUTTaxAmount,
          centralTaxAmount: inv.centralTaxAmount,
          integratedTaxAmount: inv.integratedTaxAmount,
          daysOverdue: Math.abs(inv.dueDays)
        })),
        triggeredAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      }

      const result = await sendToWebhook(payload)
      
      if (result.success) {
        successCount++
        const now = new Date()
        const nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        
        setEmailLogs(prev => {
          const filtered = prev.filter(log => log.company !== company)
          return [...filtered, {
            company,
            lastSent: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            invoiceCount: companyInvoices.length,
            nextReminderDate: nextReminder.toISOString(),
            remindersPaused: false
          }]
        })
      }
    }

    setMessage(`✓ Sent ${successCount} emails successfully!`)
    setLoading(false)
    setTimeout(() => setMessage(''), 5000)
  }

  const sendCompanyEmail = async (partyName: string) => {
    setSendingCompany(partyName)
    console.log(`🏢 Sending COMPANY email to ${partyName}`)
    
    const companyInvoices = invoices.filter(inv => inv.partyName === partyName && !inv.excluded)
    
    if (companyInvoices.length === 0) {
      setMessage('No invoices to send for this party.')
      setSendingCompany(null)
      return
    }

    const total = companyInvoices.reduce((sum, inv) => sum + inv.billAmount, 0)
    
    const payload = {
      type: 'company_bulk',
      company: partyName,
      email: companyInvoices[0].partyEmail,
      totalAmount: total,
      invoiceCount: companyInvoices.length,
      invoices: companyInvoices.map(inv => ({
        billNo: inv.billNo,
        billDate: inv.billDate,
        billAmount: inv.billAmount,
        gstAssessableAmount: inv.gstAssessableAmount,
        stateUTTaxAmount: inv.stateUTTaxAmount,
        centralTaxAmount: inv.centralTaxAmount,
        integratedTaxAmount: inv.integratedTaxAmount,
        dueDays: inv.dueDays
      })),
      triggeredAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }

    const result = await sendToWebhook(payload)
    
    if (result.success) {
      const now = new Date()
      const nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      
      setEmailLogs(prev => {
        const filtered = prev.filter(log => log.company !== partyName)
        return [...filtered, {
          company: partyName,
          lastSent: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          invoiceCount: companyInvoices.length,
          nextReminderDate: nextReminder.toISOString(),
          remindersPaused: false
        }]
      })
      setMessage(`✓ Email sent to ${partyName} with ${companyInvoices.length} invoice(s)`)
    } else {
      setMessage(`✗ Failed to send email to ${partyName}`)
    }
    
    setSendingCompany(null)
    setTimeout(() => setMessage(''), 3000)
  }

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (filterCompany && !inv.partyName.toLowerCase().includes(filterCompany.toLowerCase())) {
      return false
    }
    
    if (filterStatus === 'overdue' && inv.dueDays > 0) return false
    if (filterStatus === 'due' && inv.dueDays !== 0) return false
    if (filterStatus === 'active' && inv.dueDays < 0) return false
    
    return true
  })

  const overdueCount = invoices.filter(inv => inv.dueDays <= 0 && !inv.excluded).length
  const dueTodayCount = invoices.filter(inv => inv.dueDays === 0 && !inv.excluded).length
  const excludedCount = invoices.filter(inv => inv.excluded).length
  
  // Get unique parties
  const uniqueCompanies = Array.from(new Set(invoices.map(inv => inv.partyName)))

  return (
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
          Columns: Party GSTIN No., Party Name, Party E-Mail, Bill Date, Bill No, Due Days, GST Assessable Amount, State/UT Tax Amount, Central Tax Amount, Integrated Tax Amount, Bill Amount
        </p>
      </div>

      {message && (
        <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {invoices.length > 0 && (
        <>
          <div className="stats">
            <div className="stat-card">
              <h3>Total Invoices</h3>
              <p>{invoices.length}</p>
            </div>
            <div className="stat-card overdue">
              <h3>Overdue (Due Days ≤ 0)</h3>
              <p>{overdueCount}</p>
            </div>
            <div className="stat-card due-today">
              <h3>Due Today (0 Days)</h3>
              <p>{dueTodayCount}</p>
            </div>
            <div className="stat-card">
              <h3>Excluded</h3>
              <p>{excludedCount}</p>
            </div>
          </div>

          {overdueCount > 0 && (
            <div className="actions">
              <div>
                <strong>{overdueCount} overdue invoices</strong> from{' '}
                {new Set(invoices.filter(inv => inv.dueDays <= 0 && !inv.excluded).map(inv => inv.partyName)).size} parties
              </div>
              <button
                className="btn btn-primary"
                onClick={sendEmails}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Email Reminders'}
              </button>
            </div>
          )}

          {emailLogs.length > 0 && (
            <div className="email-logs">
              <h2>Email History</h2>
              {emailLogs.map((log, idx) => (
                <div key={idx} className="log-item">
                  <span className="log-company">{log.company}</span>
                  <span className="log-time">
                    {log.lastSent} • {log.invoiceCount} invoice{log.invoiceCount > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Filters Section */}
          <div className="table-container" style={{ marginBottom: '20px' }}>
            <div style={{ padding: '20px' }}>
              <h2 style={{ marginBottom: '15px' }}>Filters</h2>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                    Party Name
                  </label>
                  <input
                    type="text"
                    placeholder="Search party..."
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      fontSize: '14px',
                      width: '200px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      fontSize: '14px',
                      width: '150px'
                    }}
                  >
                    <option value="all">All Invoices</option>
                    <option value="overdue">Overdue Only</option>
                    <option value="due">Due Today</option>
                    <option value="active">Active (Future)</option>
                  </select>
                </div>

                {(filterCompany || filterStatus !== 'all') && (
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setFilterCompany('')
                        setFilterStatus('all')
                      }}
                      style={{
                        padding: '8px 16px',
                        background: '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    Showing {filteredInvoices.length} of {invoices.length} invoices
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Company-wise Send Buttons */}
          {uniqueCompanies.length > 0 && (
            <div className="table-container" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '15px' }}>
                <h2 style={{ marginBottom: '12px', fontSize: '16px' }}>Auto-Reminder Status (7-Day Cycle)</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                  {uniqueCompanies.map(company => {
                    const companyInvoiceCount = invoices.filter(inv => inv.partyName === company && !inv.excluded).length
                    const overdueCount = invoices.filter(inv => inv.partyName === company && inv.dueDays <= 0 && !inv.excluded).length
                    const log = emailLogs.find(l => l.company === company)
                    const isPaused = log?.remindersPaused || false
                    
                    let timeUntilNext = ''
                    let nextReminderText = 'No reminders scheduled'
                    let nextReminderDateTime = ''
                    let showReminderBadge = false
                    
                    // Priority 1: If there's a scheduled next reminder date (Last Sent + 7 days)
                    if (log?.nextReminderDate && !isPaused) {
                      const nextDate = new Date(log.nextReminderDate)
                      const diff = nextDate.getTime() - currentTime.getTime()
                      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                      
                      nextReminderDateTime = nextDate.toLocaleString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                      showReminderBadge = true
                      
                      if (diff > 0) {
                        timeUntilNext = `${days}d ${hours}h ${minutes}m`
                        nextReminderText = overdueCount > 0 ? `Next email in ${timeUntilNext}` : `Cycle continues in ${timeUntilNext}`
                      } else {
                        nextReminderText = 'Sending now'
                      }
                    } 
                    // Priority 2: If there are overdue invoices but no reminder scheduled yet
                    else if (overdueCount > 0 && !log?.nextReminderDate && !isPaused) {
                      const nextCheck = new Date(currentTime.getTime() + 60000)
                      nextReminderDateTime = nextCheck.toLocaleString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                      showReminderBadge = true
                      nextReminderText = 'First email sending soon'
                    }
                    
                    return (
                      <div key={company} style={{ 
                        padding: '14px 16px', 
                        border: isPaused ? '2px solid #ffc107' : '1px solid #ddd', 
                        borderRadius: '6px',
                        background: isPaused ? '#fff9e6' : '#f9f9f9',
                        fontSize: '14px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '15px' }}>{company}</strong>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => toggleReminderPause(company)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '12px',
                                background: isPaused ? '#28a745' : '#ffc107',
                                color: isPaused ? 'white' : '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              {isPaused ? '▶' : '⏸'}
                            </button>
                            <button
                              onClick={() => sendCompanyEmail(company)}
                              disabled={sendingCompany === company || companyInvoiceCount === 0}
                              style={{ 
                                padding: '5px 12px', 
                                fontSize: '13px',
                                background: sendingCompany === company ? '#ccc' : '#4285f4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: sendingCompany === company ? 'not-allowed' : 'pointer',
                                fontWeight: 600
                              }}
                            >
                              {sendingCompany === company ? '...' : '📧'}
                            </button>
                          </div>
                        </div>
                        
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                          {companyInvoiceCount} inv. • 
                          <span style={{ color: overdueCount > 0 ? '#dc3545' : '#28a745', fontWeight: 600 }}>
                            {' '}{overdueCount} overdue
                          </span>
                        </div>
                        
                        {log?.lastSent && (
                          <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>
                            📅 Last sent: {log.lastSent}
                          </div>
                        )}
                        
                        {showReminderBadge && nextReminderDateTime && !isPaused && (
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#fff',
                            background: 'linear-gradient(135deg, #4285f4 0%, #0d47a1 100%)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(66, 133, 244, 0.4)',
                            textAlign: 'center'
                          }}>
                            🕐 Next Reminder: {nextReminderDateTime}
                          </div>
                        )}
                        
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: 600,
                          color: isPaused ? '#856404' : (overdueCount > 0 ? '#4285f4' : '#28a745'),
                        }}>
                          {isPaused ? '⏸️ Paused' : (overdueCount > 0 ? `⏰ ${nextReminderText}` : '✓ Up to date')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="table-container">
            <h2>Invoices</h2>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Exclude</th>
                    <th>Party GSTIN No.</th>
                    <th>Party Name</th>
                    <th>Party E-Mail</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>Due Days</th>
                    <th>GST Assessable Amt</th>
                    <th>State/UT Tax Amt</th>
                    <th>Central Tax Amt</th>
                    <th>Integrated Tax Amt</th>
                    <th>Bill Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className={inv.excluded ? 'excluded' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={inv.excluded}
                          onChange={() => toggleExclude(inv.id)}
                          disabled={editingId === inv.id}
                        />
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="text"
                            value={editData.partyGSTIN || ''}
                            onChange={(e) => setEditData({ ...editData, partyGSTIN: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          inv.partyGSTIN
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="text"
                            value={editData.partyName || ''}
                            onChange={(e) => setEditData({ ...editData, partyName: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          <strong>{inv.partyName}</strong>
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="text"
                            value={editData.partyEmail || ''}
                            onChange={(e) => setEditData({ ...editData, partyEmail: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          inv.partyEmail
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="text"
                            value={editData.billNo || ''}
                            onChange={(e) => setEditData({ ...editData, billNo: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          inv.billNo
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="text"
                            value={editData.billDate || ''}
                            onChange={(e) => setEditData({ ...editData, billDate: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          inv.billDate
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="number"
                            value={editData.dueDays ?? ''}
                            onChange={(e) => setEditData({ ...editData, dueDays: parseInt(e.target.value) })}
                            style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          <span className={`status-badge ${
                            inv.dueDays > 2 ? 'good' : 
                            inv.dueDays > 0 ? 'warning' : 
                            'danger'
                          }`}>
                            {inv.dueDays > 0 ? `${inv.dueDays} days left` : 
                             inv.dueDays === 0 ? 'Due Today' : 
                             `${Math.abs(inv.dueDays)} days overdue`}
                          </span>
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="number"
                            value={editData.gstAssessableAmount ?? ''}
                            onChange={(e) => setEditData({ ...editData, gstAssessableAmount: parseFloat(e.target.value) })}
                            style={{ width: '100px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          `₹${(inv.gstAssessableAmount || 0).toLocaleString()}`
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="number"
                            value={editData.stateUTTaxAmount ?? ''}
                            onChange={(e) => setEditData({ ...editData, stateUTTaxAmount: parseFloat(e.target.value) })}
                            style={{ width: '100px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          `₹${(inv.stateUTTaxAmount || 0).toLocaleString()}`
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="number"
                            value={editData.centralTaxAmount ?? ''}
                            onChange={(e) => setEditData({ ...editData, centralTaxAmount: parseFloat(e.target.value) })}
                            style={{ width: '100px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          `₹${(inv.centralTaxAmount || 0).toLocaleString()}`
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="number"
                            value={editData.integratedTaxAmount ?? ''}
                            onChange={(e) => setEditData({ ...editData, integratedTaxAmount: parseFloat(e.target.value) })}
                            style={{ width: '100px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          `₹${(inv.integratedTaxAmount || 0).toLocaleString()}`
                        )}
                      </td>
                      <td>
                        {editingId === inv.id ? (
                          <input
                            type="number"
                            value={editData.billAmount ?? ''}
                            onChange={(e) => setEditData({ ...editData, billAmount: parseFloat(e.target.value) })}
                            style={{ width: '100px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                          />
                        ) : (
                          <strong>₹{(inv.billAmount || 0).toLocaleString()}</strong>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {editingId === inv.id ? (
                            <>
                              <button
                                onClick={saveEdit}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  background: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  background: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => sendSingleInvoiceEmail(inv)}
                                disabled={sendingInvoice === inv.id}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  background: sendingInvoice === inv.id ? '#ccc' : '#4285f4',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: sendingInvoice === inv.id ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {sendingInvoice === inv.id ? 'Sending...' : '📧 Send'}
                              </button>
                              <button
                                onClick={() => startEdit(inv)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  background: '#ffc107',
                                  color: '#000',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => deleteInvoice(inv.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
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
    </div>
  )
}

export default App
