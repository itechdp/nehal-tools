import { EmailLog } from '../types'

interface EmailHistoryProps {
  emailLogs: EmailLog[]
}

const EmailHistory = ({ emailLogs }: EmailHistoryProps) => {
  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>📜 Email History</h1>
        <p style={{ color: '#666', fontSize: '15px' }}>View all sent email reminders and their details</p>
      </div>

      {emailLogs.length > 0 ? (
        <div className="table-container">
          <h2 style={{ marginBottom: '20px' }}>Sent Emails ({emailLogs.length})</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {emailLogs.map((log, idx) => (
              <div 
                key={idx} 
                style={{ 
                  padding: '20px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  background: '#fafafa',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
                    {log.company}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    📅 Sent: {log.lastSent}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    📄 {log.invoiceCount} invoice{log.invoiceCount > 1 ? 's' : ''}
                  </div>
                  {log.nextReminderDate && (
                    <div style={{ fontSize: '13px', color: '#4285f4', marginTop: '8px', fontWeight: 600 }}>
                      ⏰ Next reminder: {new Date(log.nextReminderDate).toLocaleString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
                <div>
                  {log.remindersPaused ? (
                    <span style={{ 
                      padding: '6px 12px', 
                      background: '#ffc107', 
                      color: '#000', 
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600
                    }}>
                      ⏸️ Paused
                    </span>
                  ) : (
                    <span style={{ 
                      padding: '6px 12px', 
                      background: '#28a745', 
                      color: '#fff', 
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600
                    }}>
                      ✓ Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '80px', height: '80px', margin: '0 auto 20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3>No Email History Yet</h3>
          <p>Sent emails will appear here</p>
        </div>
      )}
    </div>
  )
}

export default EmailHistory
