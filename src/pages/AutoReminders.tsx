import { Invoice, EmailLog } from '../types'

interface AutoRemindersProps {
  invoices: Invoice[]
  emailLogs: EmailLog[]
  currentTime: Date
  sendCompanyEmail: (companyName: string) => Promise<void>
  toggleReminderPause: (companyName: string) => void
  sendingCompany: string | null
}

const AutoReminders = ({ 
  invoices, 
  emailLogs, 
  currentTime,
  sendCompanyEmail,
  toggleReminderPause,
  sendingCompany
}: AutoRemindersProps) => {
  const uniqueCompanies = Array.from(new Set(invoices.map(inv => inv.companyName)))

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>⏰ Auto Reminder Status</h1>
        <p style={{ color: '#666', fontSize: '15px' }}>
          Manage automatic 7-day reminder cycles for each company
        </p>
      </div>

      {uniqueCompanies.length > 0 ? (
        <div className="table-container">
          <h2 style={{ marginBottom: '20px' }}>Companies ({uniqueCompanies.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {uniqueCompanies.map(company => {
              const companyInvoiceCount = invoices.filter(inv => inv.companyName === company && !inv.excluded).length
              const overdueCount = invoices.filter(inv => inv.companyName === company && inv.dueDays <= 0 && !inv.excluded).length
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
                  padding: '18px 20px', 
                  border: isPaused ? '2px solid #ffc107' : '1px solid #ddd', 
                  borderRadius: '8px',
                  background: isPaused ? '#fff9e6' : '#f9f9f9',
                  fontSize: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '16px' }}>{company}</strong>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => toggleReminderPause(company)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          background: isPaused ? '#28a745' : '#ffc107',
                          color: isPaused ? 'white' : '#000',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                      </button>
                      <button
                        onClick={() => sendCompanyEmail(company)}
                        disabled={sendingCompany === company || companyInvoiceCount === 0}
                        style={{ 
                          padding: '6px 14px', 
                          fontSize: '13px',
                          background: sendingCompany === company ? '#ccc' : '#4285f4',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: sendingCompany === company ? 'not-allowed' : 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {sendingCompany === company ? 'Sending...' : '📧 Send Now'}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    📄 {companyInvoiceCount} invoice{companyInvoiceCount !== 1 ? 's' : ''} • 
                    <span style={{ color: overdueCount > 0 ? '#dc3545' : '#28a745', fontWeight: 600 }}>
                      {' '}{overdueCount} overdue
                    </span>
                  </div>
                  
                  {log?.lastSent && (
                    <div style={{ fontSize: '13px', color: '#999', marginBottom: '10px' }}>
                      📅 Last sent: {log.lastSent}
                    </div>
                  )}
                  
                  {showReminderBadge && nextReminderDateTime && !isPaused && (
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#fff',
                      background: 'linear-gradient(135deg, #4285f4 0%, #0d47a1 100%)',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(66, 133, 244, 0.4)',
                      textAlign: 'center'
                    }}>
                      🕐 Next Reminder: {nextReminderDateTime}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '14px', 
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
      ) : (
        <div className="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '80px', height: '80px', margin: '0 auto 20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>No Companies Yet</h3>
          <p>Upload invoices to see auto-reminder status</p>
        </div>
      )}
    </div>
  )
}

export default AutoReminders
