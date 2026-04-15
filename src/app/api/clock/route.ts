import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDuration } from '@/lib/timeCalc'

function getTodayDateString() {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function getCurrentTimeString() {
  const now = new Date()
  return now.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Toronto',
  })
}

function getTodayInToronto() {
  const now = new Date()
  const torontoDate = new Date(now.toLocaleString('en-CA', { timeZone: 'America/Toronto' }))
  return torontoDate
}

// GET: return all active employees with their clock status for today
export async function GET() {
  try {
    const today = getTodayInToronto()
    const todayStr = getTodayDateString()
    const startOfDay = new Date(todayStr + 'T00:00:00.000Z')
    const endOfDay = new Date(todayStr + 'T23:59:59.999Z')

    const employees = await prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    // Find current pay period
    const payPeriod = await prisma.payPeriod.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
      },
    })

    // Get today's time entries for all employees
    const todayEntries = await prisma.timeEntry.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        isAdmin: false,
      },
    })

    const employeesWithStatus = employees.map((emp) => {
      const entry = todayEntries.find((e) => e.employeeId === emp.id)
      const isClockedIn = entry && entry.clockIn && !entry.clockOut
      return {
        id: emp.id,
        name: emp.name,
        isClockedIn: !!isClockedIn,
        clockInTime: isClockedIn ? entry.clockIn : null,
        entryId: entry?.id || null,
      }
    })

    return NextResponse.json({ employees: employeesWithStatus, payPeriod })
  } catch (error) {
    console.error('Clock GET error:', error)
    return NextResponse.json({ error: 'Failed to load employees' }, { status: 500 })
  }
}

// POST: clock in or clock out
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, action } = body // action: 'in' | 'out'

    const today = getTodayInToronto()
    const todayStr = getTodayDateString()
    const currentTime = getCurrentTimeString()
    const startOfDay = new Date(todayStr + 'T00:00:00.000Z')
    const endOfDay = new Date(todayStr + 'T23:59:59.999Z')

    // Find current pay period
    const payPeriod = await prisma.payPeriod.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
      },
    })

    if (!payPeriod) {
      return NextResponse.json({ error: 'No active pay period for today' }, { status: 400 })
    }

    // Find existing entry for today
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId,
        date: { gte: startOfDay, lte: endOfDay },
        isAdmin: false,
      },
    })

    if (action === 'in') {
      if (existingEntry && existingEntry.clockIn && !existingEntry.clockOut) {
        return NextResponse.json({ error: 'Already clocked in' }, { status: 400 })
      }

      // Create new entry or update existing one that has no clockIn
      if (existingEntry) {
        const updated = await prisma.timeEntry.update({
          where: { id: existingEntry.id },
          data: { clockIn: currentTime, clockOut: null, hours: 0, minutes: 0 },
        })
        return NextResponse.json({ success: true, entry: updated, time: currentTime })
      } else {
        const created = await prisma.timeEntry.create({
          data: {
            employeeId,
            payPeriodId: payPeriod.id,
            date: today,
            clockIn: currentTime,
            clockOut: null,
            hours: 0,
            minutes: 0,
            isAdmin: false,
          },
        })
        return NextResponse.json({ success: true, entry: created, time: currentTime })
      }
    } else if (action === 'out') {
      if (!existingEntry || !existingEntry.clockIn) {
        return NextResponse.json({ error: 'Not clocked in today' }, { status: 400 })
      }
      if (existingEntry.clockOut) {
        return NextResponse.json({ error: 'Already clocked out' }, { status: 400 })
      }

      const duration = calculateDuration(existingEntry.clockIn, currentTime)
      const updated = await prisma.timeEntry.update({
        where: { id: existingEntry.id },
        data: {
          clockOut: currentTime,
          hours: duration.hours,
          minutes: duration.minutes,
        },
      })
      return NextResponse.json({
        success: true,
        entry: updated,
        time: currentTime,
        hoursWorked: duration.hours + duration.minutes / 60,
        clockIn: existingEntry.clockIn,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Clock POST error:', error)
    return NextResponse.json({ error: 'Failed to process clock action' }, { status: 500 })
  }
}
