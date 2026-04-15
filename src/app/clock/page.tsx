'use client'

import { useEffect, useState } from 'react'

interface Employee {
  id: string
  name: string
  isClockedIn: boolean
  clockInTime: string | null
  entryId: string | null
}

type Step = 'select' | 'confirm' | 'success' | 'error'

export default function ClockPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [resultMessage, setResultMessage] = useState('')
  const [resultDetail, setResultDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    loadEmployees()
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-CA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/Toronto',
        })
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadEmployees() {
    try {
      const res = await fetch('/api/clock')
      const data = await res.json()
      setEmployees(data.employees || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function handleSelectEmployee(emp: Employee) {
    setSelected(emp)
    setStep('confirm')
  }

  async function handleConfirm() {
    if (!selected) return
    setSubmitting(true)
    try {
      const action = selected.isClockedIn ? 'out' : 'in'
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selected.id, action }),
      })
      const data = await res.json()
      if (data.success) {
        if (action === 'in') {
          setResultMessage(`Clocked in at ${data.time}`)
          setResultDetail(`Have a great shift, ${selected.name}! ⛳`)
        } else {
          const totalMins = Math.round((data.hoursWorked || 0) * 60)
          const h = Math.floor(totalMins / 60)
          const m = totalMins % 60
          setResultMessage(`Clocked out at ${data.time}`)
          setResultDetail(
            `Great work ${selected.name}! You worked ${h}h ${m}m today (in at ${data.clockIn}).`
          )
        }
        setStep('success')
        // Auto-reset after 5 seconds
        setTimeout(() => {
          setStep('select')
          setSelected(null)
          loadEmployees()
        }, 5000)
      } else {
        setResultMessage('Something went wrong')
        setResultDetail(data.error || 'Please try again or see the admin.')
        setStep('error')
        setTimeout(() => {
          setStep('select')
          setSelected(null)
        }, 4000)
      }
    } catch {
      setResultMessage('Connection error')
      setResultDetail('Please check your internet connection and try again.')
      setStep('error')
      setTimeout(() => {
        setStep('select')
        setSelected(null)
      }, 4000)
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    setStep('select')
    setSelected(null)
  }

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Toronto',
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  // SUCCESS screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-7xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">{resultMessage}</h2>
          <p className="text-gray-600 text-lg">{resultDetail}</p>
          <p className="text-gray-400 text-sm mt-6">Returning to menu in 5 seconds...</p>
        </div>
      </div>
    )
  }

  // ERROR screen
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-7xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">{resultMessage}</h2>
          <p className="text-gray-600 text-lg">{resultDetail}</p>
        </div>
      </div>
    )
  }

  // CONFIRM screen
  if (step === 'confirm' && selected) {
    const action = selected.isClockedIn ? 'out' : 'in'
    const isClockIn = action === 'in'
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">{isClockIn ? '🟢' : '🔴'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-1">{selected.name}</h2>
          {selected.isClockedIn && selected.clockInTime && (
            <p className="text-gray-500 mb-4">Clocked in at {selected.clockInTime}</p>
          )}
          <p className="text-gray-500 mb-6 text-lg">
            {isClockIn
              ? `Clock in now at ${currentTime}?`
              : `Clock out now at ${currentTime}?`}
          </p>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className={`w-full py-5 rounded-2xl text-white text-2xl font-bold mb-4 transition-all ${
              isClockIn
                ? 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                : 'bg-red-500 hover:bg-red-600 active:bg-red-700'
            } disabled:opacity-50`}
          >
            {submitting ? 'Processing...' : isClockIn ? 'Clock In ✓' : 'Clock Out ✓'}
          </button>
          <button
            onClick={handleBack}
            className="w-full py-3 rounded-2xl border-2 border-gray-300 text-gray-600 text-lg font-medium hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // SELECT screen (main)
  return (
    <div className="min-h-screen bg-green-800 p-4">
      {/* Header */}
      <div className="text-center mb-6 pt-4">
        <div className="text-4xl mb-2">⛳</div>
        <h1 className="text-white text-3xl font-bold">Golf Course Timesheets</h1>
        <p className="text-green-200 mt-1">{today}</p>
        {currentTime && <p className="text-green-300 text-xl font-mono mt-1">{currentTime}</p>}
      </div>

      {/* Instructions */}
      <div className="bg-green-700 rounded-2xl p-4 mb-6 text-center max-w-sm mx-auto">
        <p className="text-white text-lg font-medium">Tap your name to clock in or out</p>
      </div>

      {/* Employee list */}
      <div className="max-w-sm mx-auto space-y-3">
        {employees.length === 0 ? (
          <div className="text-center text-green-200 py-8">No employees found.</div>
        ) : (
          employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => handleSelectEmployee(emp)}
              className="w-full bg-white rounded-2xl p-5 flex items-center justify-between shadow-lg active:scale-95 transition-transform"
            >
              <div className="text-left">
                <p className="text-xl font-bold text-gray-800">{emp.name}</p>
                {emp.isClockedIn && emp.clockInTime && (
                  <p className="text-green-600 text-sm font-medium">
                    Clocked in at {emp.clockInTime}
                  </p>
                )}
                {!emp.isClockedIn && (
                  <p className="text-gray-400 text-sm">Not clocked in</p>
                )}
              </div>
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  emp.isClockedIn ? 'bg-red-500' : 'bg-green-600'
                }`}
              >
                {emp.isClockedIn ? 'OUT' : 'IN'}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
