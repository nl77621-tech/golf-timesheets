'use client'

import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

interface Employee {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadEmployees() {
    const res = await fetch('/api/employees')
    const data = await res.json()
    setEmployees(data)
    setLoading(false)
  }

  useEffect(() => { loadEmployees() }, [])

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    setNewName('')
    loadEmployees()
  }

  async function toggleActive(emp: Employee) {
    await fetch(`/api/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !emp.active }),
    })
    loadEmployees()
  }

  async function deleteEmployee(id: string) {
    if (!confirm('Delete this employee and all their time entries?')) return
    await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    loadEmployees()
  }

  const active = employees.filter((e) => e.active)
  const inactive = employees.filter((e) => !e.active)

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Employees</h1>

        {/* Add form */}
        <form onSubmit={addEmployee} className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3">Add New Employee</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Employee name (will be uppercased)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Active employees */}
            <div className="bg-white rounded-xl shadow-sm border mb-6">
              <div className="px-5 py-4 border-b">
                <h2 className="text-lg font-semibold">Active Employees ({active.length})</h2>
              </div>
              <div className="divide-y">
                {active.map((emp) => (
                  <div key={emp.id} className="px-5 py-3 flex items-center justify-between">
                    <span className="font-medium">{emp.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive(emp)}
                        className="text-amber-600 hover:text-amber-700 text-sm font-medium px-3 py-1 rounded border border-amber-200 hover:bg-amber-50 transition-colors"
                      >
                        Deactivate
                      </button>
                      <button
                        onClick={() => deleteEmployee(emp.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {active.length === 0 && (
                  <div className="px-5 py-8 text-center text-gray-400">No active employees</div>
                )}
              </div>
            </div>

            {/* Inactive employees */}
            {inactive.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="px-5 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-500">Inactive Employees ({inactive.length})</h2>
                </div>
                <div className="divide-y">
                  {inactive.map((emp) => (
                    <div key={emp.id} className="px-5 py-3 flex items-center justify-between opacity-60">
                      <span className="font-medium">{emp.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(emp)}
                          className="text-green-600 hover:text-green-700 text-sm font-medium px-3 py-1 rounded border border-green-200 hover:bg-green-50 transition-colors"
                        >
                          Reactivate
                        </button>
                        <button
                          onClick={() => deleteEmployee(emp.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
