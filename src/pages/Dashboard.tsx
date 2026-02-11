import { useState } from 'react'
import { Invoice } from '../types'
import { invoiceService } from '../services/database'

interface DashboardProps {
  invoices: Invoice[]
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>
  loading: boolean
  setMessage: React.Dispatch<React.SetStateAction<string>>
  sendEmails: () => Promise<void>
  sendSingleInvoiceEmail: (invoice: Invoice) => Promise<void>
  sendingInvoice: string | null
  overdueCount: number
  dueTodayCount: number
  excludedCount: number
}

const Dashboard = ({
  invoices,
  setInvoices,
  loading,
  setMessage,
  sendEmails,
  sendSingleInvoiceEmail,
  sendingInvoice,
  overdueCount,
  dueTodayCount,
  excludedCount
}: DashboardProps) => {
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Invoice>>({})

  const toggleExclude = async (id: string) => {
    const invoice = invoices.find(inv => inv.id === id)
    if (!invoice) return
    
    const updated = await invoiceService.updateInvoice(id, { excluded: !invoice.excluded })
    if (updated) {
      setInvoices(invoices.map(inv => inv.id === id ? updated : inv))
    }
  }

  const deleteInvoice = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      const success = await invoiceService.deleteInvoice(id)
      if (success) {
        setInvoices(invoices.filter(inv => inv.id !== id))
        setMessage('[SUCCESS] Invoice deleted successfully')
        setTimeout(() => setMessage(''), 2000)
      } else {
        setMessage('[ERROR] Failed to delete invoice')
        setTimeout(() => setMessage(''), 2000)
      }
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

  const saveEdit = async () => {
    if (!editingId) return
    
    const updated = await invoiceService.updateInvoice(editingId, editData)
    if (updated) {
      setInvoices(invoices.map(inv => 
        inv.id === editingId ? updated : inv
      ))
      setMessage('[SUCCESS] Invoice updated successfully')
    } else {
      setMessage('[ERROR] Failed to update invoice')
    }
    setTimeout(() => setMessage(''), 2000)
    setEditingId(null)
    setEditData({})
  }

  const filteredInvoices = invoices.filter(inv => {
    if (filterCompany && !inv.companyName.toLowerCase().includes(filterCompany.toLowerCase())) {
      return false
    }
    
    if (filterStatus === 'overdue' && inv.dueDays > 0) return false
    if (filterStatus === 'due' && inv.dueDays !== 0) return false
    if (filterStatus === 'active' && inv.dueDays < 0) return false
    
    return true
  })

  return (
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
            {new Set(invoices.filter(inv => inv.dueDays <= 0 && !inv.excluded).map(inv => inv.companyName)).size} companies
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

      {/* Filters Section */}
      <div className="table-container" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '15px' }}>Filters</h2>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                Company Name
              </label>
              <input
                type="text"
                placeholder="Search company..."
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

      <div className="table-container">
        <h2>Invoices</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Exclude</th>
                <th>Company Name</th>
                <th>Company Email</th>
                <th>Invoice No.</th>
                <th>Invoice Date</th>
                <th>Due Days</th>
                <th>Bill Amount</th>
                <th>Pending Amount</th>
                <th>Balance Amount</th>
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
                        value={editData.companyName || ''}
                        onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                        style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                      />
                    ) : (
                      <strong>{inv.companyName}</strong>
                    )}
                  </td>
                  <td>
                    {editingId === inv.id ? (
                      <input
                        type="text"
                        value={editData.companyEmail || ''}
                        onChange={(e) => setEditData({ ...editData, companyEmail: e.target.value })}
                        style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                      />
                    ) : (
                      inv.companyEmail
                    )}
                  </td>
                  <td>
                    {editingId === inv.id ? (
                      <input
                        type="text"
                        value={editData.invoiceNo || ''}
                        onChange={(e) => setEditData({ ...editData, invoiceNo: e.target.value })}
                        style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                      />
                    ) : (
                      inv.invoiceNo
                    )}
                  </td>
                  <td>
                    {editingId === inv.id ? (
                      <input
                        type="text"
                        value={editData.invoiceDate || ''}
                        onChange={(e) => setEditData({ ...editData, invoiceDate: e.target.value })}
                        style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                      />
                    ) : (
                      inv.invoiceDate
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
                        type="text"
                        value={editData.billAmount ?? ''}
                        onChange={(e) => setEditData({ ...editData, billAmount: e.target.value })}
                        style={{ width: '120px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                      />
                    ) : (
                      <strong>{inv.billAmount}</strong>
                    )}
                  </td>
                  <td>
                    {editingId === inv.id ? (
                      <input
                        type="text"
                        value={editData.pendingAmount ?? ''}
                        onChange={(e) => setEditData({ ...editData, pendingAmount: e.target.value })}
                        style={{ width: '120px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                      />
                    ) : (
                      inv.pendingAmount
                    )}
                  </td>
                  <td>
                    {editingId === inv.id ? (
                      <input
                        type="text"
                        value={editData.balanceAmount ?? ''}
                        onChange={(e) => setEditData({ ...editData, balanceAmount: e.target.value })}
                        style={{ width: '120px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' }}
                      />
                    ) : (
                      inv.balanceAmount
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
  )
}

export default Dashboard
