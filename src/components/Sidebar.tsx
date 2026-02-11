import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>📧 Bill Reminder</h2>
      </div>
      
      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Dashboard</span>
        </Link>
        
        <Link 
          to="/email-history" 
          className={`nav-item ${isActive('/email-history') ? 'active' : ''}`}
        >
          <span className="nav-icon">📜</span>
          <span className="nav-label">Email History</span>
        </Link>
        
        <Link 
          to="/auto-reminders" 
          className={`nav-item ${isActive('/auto-reminders') ? 'active' : ''}`}
        >
          <span className="nav-icon">⏰</span>
          <span className="nav-label">Auto Reminders</span>
        </Link>
      </nav>
    </div>
  )
}

export default Sidebar
