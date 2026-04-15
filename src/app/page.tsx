'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

interface Employee {
  id: string
  name: string
  active: boolean
}

interface PayPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface TimeEntry {
  id: string
  employeeId: string
  hours: number
  minutes: number
  isAdmin: boolean
  adminHours: number | null
  adminMinutes: number | null
}

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([])
  const [currentPeriod, setCurrentPeriod] = useState<PayPeriod | null>(null)
  const [periodEntries, setPeriodEntries] = useState<TimeEntry[]>([])
  const [seeded, setSeeded] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [empRes, ppRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/pay-periods'),
    ])
    const emps = await empRes.json()
    let pps = await ppRes.json()

    setEmployees(emps)

    if (pps.length === 0 && !seeded) {
      await fetch('/api/pay-periods/seed', { method: 'POST' })
      setSeeded(true)
      const ppRes2 = await fetch('/api/pay-periods')
      pps = await ppRes2.json()
    }
    setPayPeriods(pps)

    const now = new Date()
    const current = pps.find((pp: PayPeriod) => {
      const start = new Date(pp.startDate)
      const end = new Date(pp.endDate)
      end.setHours(23, 59, 59)
      return now >= start && now <= end
    })
    setCurrentPeriod(current || pps[0] || null)
    setLoading(false)
  }, [seeded])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!currentPeriod) return
    fetch(`/api/time-entries?payPeriodId=${currentPeriod.id}`)
      .then((r) => r.json())
      .then(setPeriodEntries)
  }, [currentPeriod])

  const activeEmployees = employees.filter((e) => e.active)

  const employeeHours = activeEmployees.map((emp) => {
    const entries = periodEntries.filter((e) => e.employeeId === emp.id)
    let totalMin = 0
    for (const entry of entries) {
      if (entry.isAdmin) {
        totalMin += (entry.adminHours || 0) * 60 + (entry.adminMinutes || 0)
      } else {
        totalMin += entry.hours * 60 + entry.minutes
      }
    }
    return {
      ...emp,
      totalHours: Math.floor(totalMin / 60),
      totalMinutes: totalMin % 60,
      decimal: Math.round((totalMin / 60) * 100) / 100,
      entryCount: entries.length,
    }
  })

  const totalAllHours = employeeHours.reduce((sum, e) => sum + e.decimal, 0)

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              {currentPeriod && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Current Period: {currentPeriod.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Active Employees</p>
                <p className="text-3xl font-bold text-gray-900">{activeEmployees.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Pay Periods</p>
                <p className="text-3xl font-bold text-gray-900">{payPeriods.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Entries This Period</p>
                <p className="text-3xl font-bold text-gray-900">{periodEntries.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Total Hours This Period</p>
                <p className="text-3xl font-bold text-gray-900">{Math.round(totalAllHours * 100) / 100}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Employee Hours — {currentPeriod?.name || 'N/A'}</h2>
                {currentPeriod && (
                  <Link href={`/timesheets?period=${currentPeriod.id}`} className="text-green-700 hover:text-green-800 text-sm font-medium">
                    View Timesheets &rarr;
                  </Link>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left text-sm text-gray-500">
                      <th className="px-5 py-3 font-medium">Employee</th>
                      <th className="px-5 py-3 font-medium text-center">Entries</th>
                      <th className="px-5 py-3 font-medium text-center">Hours</th>
                      <th className="px-5 py-3 font-medium text-center">Minutes</th>
                      <th className="px-5 py-3 font-medium text-center">Decimal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employeeHours.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                          No employees yet. <Link href="/employees" className="text-green-700 underline">Add employees</Link> to get started.
                        </td>
                      </tr>
                    ) : (
                      employeeHours.map((emp) => (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium">{emp.name}</td>
                          <td className="px-5 py-3 text-center">{emp.entryCount}</td>
                          <td className="px-5 py-3 text-center">{emp.totalHours}</td>
                          <td className="px-5 py-3 text-center">{emp.totalMinutes}</td>
                          <td className="px-5 py-3 text-center font-semibold">{emp.decimal}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/timesheets" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow group">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700">Manage Timesheets</h3>
                <p className="text-sm text-gray-500 mt-1">Enter clock in/out times for employees</p>
              </Link>
              <Link href="/employees" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow group">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700">Manage Employees</h3>
                <p className="text-sm text-gray-500 mt-1">Add, edit, or deactivate employees</p>
              </Link>
              <Link href="/stat-holidays" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow group">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700">Stat Holidays</h3>
                <p className="text-sm text-gray-500 mt-1">Calculate Ontario stat holiday pay</p>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
