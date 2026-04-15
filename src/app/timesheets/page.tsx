'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Nav from '@/components/Nav'

interface Employee { id: string; name: string; active: boolean }
interface PayPeriod { id: string; name: string; startDate: string; endDate: string }
interface TimeEntry {
  id: string; employeeId: string; payPeriodId: string; date: string | null
  clockIn: string | null; clockOut: string | null; hours: number; minutes: number
  isAdmin: boolean; adminHours: number | null; adminMinutes: number | null
  employee: Employee
}

export default function TimesheetsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <TimesheetsContent />
    </Suspense>
  )
}

function TimesheetsContent() {
  const searchParams = useSearchParams()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  // Form state
  const [formDate, setFormDate] = useState('')
  const [formClockIn, setFormClockIn] = useState('')
  const [formClockOut, setFormClockOut] = useState('')
  const [formIsAdmin, setFormIsAdmin] = useState(false)
  const [formAdminHours, setFormAdminHours] = useState('0')
  const [formAdminMinutes, setFormAdminMinutes] = useState('0')

  const loadData = useCallback(async () => {
    const [empRes, ppRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/pay-periods'),
    ])
    const emps = await empRes.json()
    const pps = await ppRes.json()
    setEmployees(emps.filter((e: Employee) => e.active))
    setPayPeriods(pps)

    const periodParam = searchParams.get('period')
    if (periodParam) {
      setSelectedPeriod(periodParam)
    } else if (pps.length > 0) {
      const now = new Date()
      const current = pps.find((pp: PayPeriod) => {
        const start = new Date(pp.startDate)
        const end = new Date(pp.endDate)
        end.setHours(23, 59, 59)
        return now >= start && now <= end
      })
      setSelectedPeriod(current?.id || pps[0].id)
    }
    setLoading(false)
  }, [searchParams])

  useEffect(() => { loadData() }, [loadData])

  const loadEntries = useCallback(async () => {
    if (!selectedPeriod) return
    let url = `/api/time-entries?payPeriodId=${selectedPeriod}`
    if (selectedEmployee) url += `&employeeId=${selectedEmployee}`
    const res = await fetch(url)
    const data = await res.json()
    setEntries(data)
  }, [selectedPeriod, selectedEmployee])

  useEffect(() => { loadEntries() }, [loadEntries])

  function resetForm() {
    setFormDate('')
    setFormClockIn('')
    setFormClockOut('')
    setFormIsAdmin(false)
    setFormAdminHours('0')
    setFormAdminMinutes('0')
    setEditingEntry(null)
    setShowForm(false)
  }

  function startEdit(entry: TimeEntry) {
    setEditingEntry(entry)
    setSelectedEmployee(entry.employeeId)
    setFormDate(entry.date ? entry.date.split('T')[0] : '')
    setFormClockIn(entry.clockIn || '')
    setFormClockOut(entry.clockOut || '')
    setFormIsAdmin(entry.isAdmin)
    setFormAdminHours(String(entry.adminHours || 0))
    setFormAdminMinutes(String(entry.adminMinutes || 0))
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const empId = selectedEmployee || employees[0]?.id
    if (!empId || !selectedPeriod) return

    const body = {
      employeeId: empId,
      payPeriodId: selectedPeriod,
      date: formDate || null,
      clockIn: formIsAdmin ? null : formClockIn,
      clockOut: formIsAdmin ? null : formClockOut,
      isAdmin: formIsAdmin,
      adminHours: formIsAdmin ? parseFloat(formAdminHours) || 0 : null,
      adminMinutes: formIsAdmin ? parseInt(formAdminMinutes) || 0 : null,
    }

    if (editingEntry) {
      await fetch(`/api/time-entries/${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    resetForm()
    loadEntries()
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this entry?')) return
    await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    loadEntries()
  }

  async function exportExcel() {
    if (!selectedPeriod) return
    window.open(`/api/export?payPeriodId=${selectedPeriod}`, '_blank')
  }

  // Group entries by employee
  const grouped: Record<string, TimeEntry[]> = {}
  for (const entry of entries) {
    const name = entry.employee.name
    if (!grouped[name]) grouped[name] = []
    grouped[name].push(entry)
  }

  function calcTotal(empEntries: TimeEntry[]) {
    let totalMin = 0
    for (const e of empEntries) {
      if (e.isAdmin) totalMin += (e.adminHours || 0) * 60 + (e.adminMinutes || 0)
      else totalMin += e.hours * 60 + e.minutes
    }
    const hrs = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    return { hrs, mins, decimal: Math.round((totalMin / 60) * 100) / 100 }
  }

  const currentPeriodObj = payPeriods.find((p) => p.id === selectedPeriod)

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              disabled={!selectedPeriod}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              Export Excel
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              + Add Entry
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-1">Pay Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              {payPeriods.map((pp) => (
                <option key={pp.id} value={pp.id}>{pp.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-1">Filter by Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingEntry ? 'Edit Entry' : 'Add Time Entry'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Employee</label>
                  <select
                    value={selectedEmployee || employees[0]?.id || ''}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    min={currentPeriodObj?.startDate.split('T')[0]}
                    max={currentPeriodObj?.endDate.split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsAdmin}
                      onChange={(e) => setFormIsAdmin(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">ADMIN Entry</span>
                  </label>
                </div>
              </div>

              {formIsAdmin ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Hours</label>
                    <input
                      type="number"
                      min="0"
                      value={formAdminHours}
                      onChange={(e) => setFormAdminHours(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formAdminMinutes}
                      onChange={(e) => setFormAdminMinutes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Clock In</label>
                    <input
                      type="time"
                      value={formClockIn}
                      onChange={(e) => setFormClockIn(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required={!formIsAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Clock Out</label>
                    <input
                      type="time"
                      value={formClockOut}
                      onChange={(e) => setFormClockOut(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required={!formIsAdmin}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 rounded-lg transition-colors">
                  {editingEntry ? 'Update' : 'Save'}
                </button>
                <button type="button" onClick={resetForm} className="text-gray-600 hover:text-gray-800 font-medium px-6 py-2 rounded-lg border hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Entries grouped by employee */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400">
            No time entries for this period yet. Click &quot;+ Add Entry&quot; to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([empName, empEntries]) => {
              const totals = calcTotal(empEntries)
              return (
                <div key={empName} className="bg-white rounded-xl shadow-sm border">
                  <div className="px-5 py-4 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
                    <h3 className="font-bold text-lg">{empName}</h3>
                    <span className="text-sm font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full">
                      Total: {totals.hrs}h {totals.mins}m ({totals.decimal} decimal)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 border-b">
                          <th className="px-5 py-2 font-medium">Date</th>
                          <th className="px-5 py-2 font-medium">In</th>
                          <th className="px-5 py-2 font-medium">Out</th>
                          <th className="px-5 py-2 font-medium text-center">Hours</th>
                          <th className="px-5 py-2 font-medium text-center">Minutes</th>
                          <th className="px-5 py-2 font-medium text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {empEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-5 py-2">
                              {entry.isAdmin ? (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">ADMIN</span>
                              ) : entry.date ? (
                                new Date(entry.date).toLocaleDateString('en-CA')
                              ) : '—'}
                            </td>
                            <td className="px-5 py-2">{entry.clockIn || '—'}</td>
                            <td className="px-5 py-2">{entry.clockOut || '—'}</td>
                            <td className="px-5 py-2 text-center">
                              {entry.isAdmin ? entry.adminHours : entry.hours}
                            </td>
                            <td className="px-5 py-2 text-center">
                              {entry.isAdmin ? entry.adminMinutes : entry.minutes}
                            </td>
                            <td className="px-5 py-2 text-center">
                              <button onClick={() => startEdit(entry)} className="text-blue-600 hover:text-blue-800 text-sm mr-2">Edit</button>
                              <button onClick={() => deleteEntry(entry.id)} className="text-red-600 hover:text-red-800 text-sm">Del</button>
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
        )}
      </main>
    </div>
  )
}
