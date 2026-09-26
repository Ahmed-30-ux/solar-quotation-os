import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import Icon from '../components/icons'

const STATUSES = [
  { key: 'new', label: 'New', color: '#0ea5e9', badge: 'bg-sky-500/20 text-sky-400' },
  { key: 'qualified', label: 'Qualified', color: '#3b82f6', badge: 'bg-blue-500/20 text-blue-400' },
  { key: 'quoted', label: 'Quoted', color: '#f59e0b', badge: 'bg-amber-500/20 text-amber-400' },
  { key: 'interested', label: 'Interested', color: '#f97316', badge: 'bg-orange-500/20 text-orange-400' },
  { key: 'negotiating', label: 'Negotiating', color: '#8b5cf6', badge: 'bg-violet-500/20 text-violet-400' },
  { key: 'won', label: 'Won', color: '#10b981', badge: 'bg-emerald-500/20 text-emerald-400' },
  { key: 'lost', label: 'Lost', color: '#f43f5e', badge: 'bg-rose-500/20 text-rose-400' },
]

const STAT_KEY_MAP = {
  new: 'new',
  qualified: 'qualified',
  quoted: 'quoted',
  interested: 'interested',
  negotiating: 'negotiating',
  won: 'won',
  lost: 'lost',
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function getAvatarGradient(name) {
  if (!name) return 'from-slate-500 to-slate-600'
  const gradients = [
    'from-sky-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
    'from-indigo-500 to-blue-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '—'
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function MoveDropdown({ leadId, currentStatus, onMove }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const otherStatuses = STATUSES.filter((s) => s.key !== currentStatus)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-surface-4"
      >
        <Icon name="arrow-right" size={12} />
        Move
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface-3 border border-surface-4 rounded-lg shadow-xl py-1 min-w-[160px]">
          {otherStatuses.map((status) => (
            <button
              key={status.key}
              onClick={async (e) => {
                e.stopPropagation()
                await onMove(leadId, status.key)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-surface-4 hover:text-white transition-colors text-left"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: status.color }}
              />
              {status.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LeadCard({ lead, onMove }) {
  const navigate = useNavigate()

  const statusMeta = STATUSES.find((s) => s.key === lead.status) || STATUSES[0]

  return (
    <div
      onClick={() => navigate(`/leads/${lead._id}`)}
      className="bg-surface-2 border border-surface-4 rounded-xl p-4 cursor-pointer hover:border-slate-500 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(
              lead.customerName
            )} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}
          >
            {getInitials(lead.customerName)}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{lead.customerName}</h4>
            <p className="text-xs text-slate-400 truncate">{lead.phone}</p>
          </div>
        </div>
        <MoveDropdown leadId={lead._id} currentStatus={lead.status} onMove={onMove} />
      </div>

      <div className="space-y-2 mb-3">
        {lead.city && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Icon name="map-pin" size={12} />
            <span className="truncate">{lead.city}</span>
          </div>
        )}
        {lead.monthlyConsumption != null && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Icon name="zap" size={12} />
            <span>{lead.monthlyConsumption} kWh/mo</span>
          </div>
        )}
        {lead.systemType && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Icon name="sun" size={12} />
            <span className="truncate">{lead.systemType}</span>
          </div>
        )}
        {lead.assignedTo && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Icon name="user" size={12} />
            <span className="truncate">{lead.assignedTo.name || lead.assignedTo}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-surface-4">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusMeta.badge}`}
        >
          {statusMeta.label}
        </span>
        {lead.quotationAmount != null && (
          <span className="text-xs font-semibold text-white">
            {formatCurrency(lead.quotationAmount)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function KanbanLeads() {
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchLeads()
    fetchStats()
  }, [])

  async function fetchLeads() {
    try {
      setLoading(true)
      const { data } = await api.get('/leads')
      setLeads(Array.isArray(data) ? data : data.leads || [])
    } catch (err) {
      console.error('Failed to fetch leads:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const { data } = await api.get('/leads/stats')
      setStats(data || {})
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  async function handleMove(leadId, newStatus) {
    try {
      await api.put(`/leads/${leadId}`, { status: newStatus })
      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? { ...l, status: newStatus } : l))
      )
      fetchStats()
    } catch (err) {
      console.error('Failed to move lead:', err)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (lead.customerName || '').toLowerCase().includes(q) ||
      (lead.phone || '').toLowerCase().includes(q) ||
      (lead.city || '').toLowerCase().includes(q) ||
      (lead.email || '').toLowerCase().includes(q)
    )
  })

  const leadsByStatus = STATUSES.reduce((acc, s) => {
    acc[s.key] = filteredLeads.filter((l) => l.status === s.key)
    return acc
  }, {})

  const totalCount = filteredLeads.length

  return (
    <div className="h-full flex flex-col bg-surface-1">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-4 bg-surface-1">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Lead Pipeline</h1>
          <span className="text-sm text-slate-400 bg-surface-3 px-2.5 py-0.5 rounded-full">
            {totalCount} lead{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-3 border border-surface-4 text-white text-sm rounded-lg pl-9 pr-4 py-2 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
          <div className="flex items-center bg-surface-3 border border-surface-4 rounded-lg p-0.5">
            <button
              onClick={() => setView('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'board'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon name="layout-grid" size={14} />
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon name="list" size={14} />
              List
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400 flex items-center gap-2">
              <Icon name="loader" size={20} className="animate-spin" />
              Loading leads...
            </div>
          </div>
        ) : view === 'board' ? (
          <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {STATUSES.map((status) => {
              const columnLeads = leadsByStatus[status.key] || []
              const count = stats[STAT_KEY_MAP[status.key]] ?? columnLeads.length
              return (
                <div key={status.key} className="flex flex-col min-w-[300px] w-[300px] flex-shrink-0">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-surface-3 rounded-xl mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <h3 className="text-sm font-semibold text-white">{status.label}</h3>
                    </div>
                    <span className="text-xs text-slate-400 bg-surface-4 px-2 py-0.5 rounded-full font-medium">
                      {count}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {columnLeads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <Icon name="inbox" size={28} className="mb-2 opacity-40" />
                        <span className="text-sm">No leads</span>
                      </div>
                    ) : (
                      columnLeads.map((lead) => (
                        <LeadCard key={lead._id} lead={lead} onMove={handleMove} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            <div className="grid gap-3">
              {STATUSES.map((status) => {
                const columnLeads = leadsByStatus[status.key] || []
                if (columnLeads.length === 0) return null
                return (
                  <div key={status.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <h3 className="text-sm font-semibold text-white">{status.label}</h3>
                      <span className="text-xs text-slate-400">{columnLeads.length}</span>
                    </div>
                    <div className="bg-surface-2 border border-surface-4 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-surface-4 text-xs text-slate-400">
                            <th className="text-left px-4 py-3 font-medium">Customer</th>
                            <th className="text-left px-4 py-3 font-medium">Phone</th>
                            <th className="text-left px-4 py-3 font-medium">City</th>
                            <th className="text-left px-4 py-3 font-medium">Consumption</th>
                            <th className="text-left px-4 py-3 font-medium">System</th>
                            <th className="text-right px-4 py-3 font-medium">Amount</th>
                            <th className="text-left px-4 py-3 font-medium">Salesperson</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columnLeads.map((lead) => (
                            <tr
                              key={lead._id}
                              onClick={() => navigate(`/leads/${lead._id}`)}
                              className="border-b border-surface-4 last:border-0 hover:bg-surface-3 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                      lead.customerName
                                    )} flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0`}
                                  >
                                    {getInitials(lead.customerName)}
                                  </div>
                                  <span className="text-sm text-white font-medium truncate">
                                    {lead.customerName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-300">{lead.phone}</td>
                              <td className="px-4 py-3 text-sm text-slate-300">{lead.city}</td>
                              <td className="px-4 py-3 text-sm text-slate-300">
                                {lead.monthlyConsumption != null
                                  ? `${lead.monthlyConsumption} kWh`
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-[120px]">
                                {lead.systemType || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-white text-right font-medium">
                                {formatCurrency(lead.quotationAmount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-300">
                                {lead.assignedTo?.name || lead.assignedTo || '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <MoveDropdown
                                  leadId={lead._id}
                                  currentStatus={lead.status}
                                  onMove={handleMove}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
