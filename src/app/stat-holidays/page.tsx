'use client'

import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

interface StatHoliday {
  id: string
  name: string
  displayName: string
  date: string
  windowStart: string
  windowEnd: string
  entries: StatHolidayEntry[]
}

interface StatHolidayEntry {
  id: string
  employeeId: string
  totalHours: number
  statPayHours: number
  employee: { id: string; name: string }
}

export default function StatHolidaysPage() {
  const [holidays, setHolidays] = useState<StatHoliday[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState<string | null>(null)

  async function loadHolidays() {
    const res = await fetch('/api/stat-holidays')
    const data = await res.json()
    setHolidays(data)
    setLoading(false)
  }

  useEffect(() => { loadHolidays() }, [])

  async function calculateHoliday(id: string) {
    setCalculating(id)
    await fetch('/api/stat-holidays/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statHolidayId: id }),
    })
    await loadHolidays()
    setCalculating(null)
  }

  async function calculateAll() {
    setCalculating('all')
    for (const h of holidays) {
      await fetch('/api/stat-holidays/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statHolidayId: h.id }),
      })
    }
    await loadHolidays()
    setCalculating(null)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ontario Stat Holiday Pay</h1>
            <p className="text-sm text-gray-500 mt-1">
              Stat Pay = Total Hours in Prior 4-Week Window ÷ 20 (Ontario ESA)
            </p>
          </div>
          <button
            onClick={calculateAll}
            disabled={calculating !== null}
            className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {calculating === 'all' ? 'Calculating...' : 'Recalculate All'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : holidays.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400">
            No stat holidays configured. They will be seeded when you visit the dashboard.
          </div>
        ) : (
          <div className="space-y-6">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="bg-white rounded-xl shadow-sm border">
                <div className="px-5 py-4 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{holiday.displayName}</h3>
                    <p className="text-sm text-gray-500">
                      Date: {formatDate(holiday.date)} | 4-week window: {formatDate(holiday.windowStart)} to {formatDate(holiday.windowEnd)}
                    </p>
                  </div>
                  <button
                    onClick={() => calculateHoliday(holiday.id)}
                    disabled={calculating !== null}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
                  >
                    {calculating === holiday.id ? 'Calculating...' : 'Recalculate'}
                  </button>
                </div>

                {holiday.entries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 border-b">
                          <th className="px-5 py-2 font-medium">Employee</th>
                          <th className="px-5 py-2 font-medium text-center">Total Hours (Prior 4 Wks)</th>
                          <th className="px-5 py-2 font-medium text-center">Stat Pay Hours (÷20)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {holiday.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-5 py-2 font-medium">{entry.employee.name}</td>
                            <td className="px-5 py-2 text-center">{entry.totalHours}</td>
                            <td className="px-5 py-2 text-center font-semibold text-green-700">{entry.statPayHours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center text-gray-400 text-sm">
                    Not yet calculated. Click &quot;Recalculate&quot; to compute stat pay hours.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
