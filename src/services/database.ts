import { supabase } from '../config/supabase'
import { Invoice, EmailLog } from '../types'

// Invoice Operations
export const invoiceService = {
  // Get all invoices
  async getAllInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching invoices:', error)
      return []
    }
  },

  // Add a new invoice
  async addInvoice(invoice: Invoice): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoice])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding invoice:', error)
      return null
    }
  },

  // Add multiple invoices (bulk upload)
  async addInvoices(invoices: Invoice[]): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoices)
        .select()

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error adding invoices:', error)
      return []
    }
  },

  // Update an invoice
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating invoice:', error)
      return null
    }
  },

  // Delete an invoice
  async deleteInvoice(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting invoice:', error)
      return false
    }
  },

  // Clear all invoices
  async clearAllInvoices(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .neq('id', '')

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error clearing invoices:', error)
      return false
    }
  }
}

// Email Log Operations
export const emailLogService = {
  // Get all email logs
  async getAllLogs(): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('last_sent', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching email logs:', error)
      return []
    }
  },

  // Add or update email log
  async upsertLog(log: EmailLog): Promise<EmailLog | null> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .upsert([log], {
          onConflict: 'company',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error upserting email log:', error)
      return null
    }
  },

  // Update multiple logs
  async updateLogs(logs: EmailLog[]): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .upsert(logs, {
          onConflict: 'company',
          ignoreDuplicates: false
        })
        .select()

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error updating email logs:', error)
      return []
    }
  },

  // Get log by company
  async getLogByCompany(company: string): Promise<EmailLog | null> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('company', company)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching email log:', error)
      return null
    }
  }
}
