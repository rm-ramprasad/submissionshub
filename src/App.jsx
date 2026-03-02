import { useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import SolutionTablesPage from './pages/SolutionTablesPage'
import './App.css'

export default function App() {
  const [page, setPage] = useState('home')

  if (page === 'solution-tables') return <SolutionTablesPage onNavigate={setPage} />
  return <DashboardPage onNavigate={setPage} />
}
