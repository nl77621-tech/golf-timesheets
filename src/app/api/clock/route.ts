import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDuration } from '@/lib/timeCalc'

// Get current date/time strings in Toronto timezone
function getTorontoDateTime() {
  const now = new Date()
  // Format date parts in Toronto timezone
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour')
  const minute = get('minute')

  const dateStr = `${year}-${month}-${day}` // "2026-04-15"
  const timeStr = `${hour}:${minute}`        // "14:30"

  // Build a proper Date at start/end of today in UTC by parsing the Toronto date
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)
  // For pay period comparison, use a mid-day timestamp
  const todayMidDay = new Date(`${dateStr}T12:00:00.000Z`)

  return { dateStr, timeStr, startOfDay, endOfDay, todayMidDay }
}

// GET: return all active employees with their clock status for today
export async function GET() {
  try {
    const { startOfDay, endOfDay, todayMidDay } = getTorontoDateTime()

    const [employees, payPeriod, todayEntries] = await Promise.all([
      prisma.employee.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.payPeriod.findFirst({
        where: {
          startDate: { lte: todayMidDay },
          endDate: { gte: todayMidDay },
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          isAdmin: false,
        },
      }),
    ])

    const employeesWithStatus = employees.map((emp) => {
      const entry = todayEntries.find((e) => e.employeeId === emp.id)
      const isClockedIn = !!(entry && entry.clockIn && !entry.clockOut)
      return {
        id: emp.id,
        name: emp.name,
        isClockedIn,
        clockInTime: isClockedIn ? entry!.clockIn : null,
        entryId: entry?.id ?? null,
      }
    })

    return NextResponse.json({ employees: employeesWithStatus, payPeriod })
  } catch (error) {
    console.error('Clock GET error:', error)
    return NextResponse.json({ error: 'Failed to load employees', detail: String(error) }, { status: 500 })
  }
}

// POST: clock in or clock out
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, action } = body // action: 'in' | 'out'

    const { dateStr, timeStr, startOfDay, endOfDay, todayMidDay } = getTorontoDateTime()

    const [payPeriod, existingEntry] = await Promise.all([
      prisma.payPeriod.findFirst({
        where: {
          startDate: { lte: todayMidDay },
          endDate: { gte: todayMidDay },
        },
      }),
      prisma.timeEntry.findFirst({
        where: {
          employeeId,
          date: { gte: startOfDay, lte: endOfDay },
          isAdmin: false,
        },
      }),
    ])

    if (!payPeriod) {
      return NextResponse.json({ error: 'No active pay period for today' }, { status: 400 })
    }

    if (action === 'in') {
      if (existingEntry?.clockIn && !existingEntry?.clockOut) {
        return NextResponse.json({ error: 'Already clocked in' }, { status: 400 })
      }
      if (existingEntry) {
        const updated = await prisma.timeEntry.update({
          where: { id: existingEntry.id },
          data: { clockIn: timeStr, clockOut: null, hours: 0, minutes: 0 },
        })
        return NextResponse.json({ success: true, entry: updated, time: timeStr })
      } else {
        const created = await prisma.timeEntry.create({
          data: {
            employeeId,
            payPeriodId: payPeriod.id,
            date: new Date(`${dateStr}T12:00:00.000Z`),
            clockIn: timeStr,
            clockOut: null,
            hours: 0,
            minutes: 0,
            isAdmin: false,
          },
        })
        return NextResponse.json({ success: true, entry: created, time: timeStr })
      }
    } else if (action === 'out') {
      if (!existingEntry?.clockIn) {
        return NextResponse.json({ error: 'Not clocked in today' }, { status: 400 })
      }
      if (existingEntry.clockOut) {
        return NextResponse.json({ error: 'Already clocked out' }, { status: 400 })
      }
      const duration = calculateDuration(existingEntry.clockIn, timeStr)
      const updated = await prisma.timeEntry.update({
        where: { id: existingEntry.id },
        data: { clockOut: timeStr, hours: duration.hours, minutes: duration.minutes },
      })
      return NextResponse.json({
        success: true,
        entry: updated,
        time: timeStr,
        hoursWorked: duration.hours + duration.minutes / 60,
        clockIn: existingEntry.clockIn,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Clock POST error:', error)
    return NextResponse.json({ error: 'Failed to process clock action', detail: String(error) }, { status: 500 })
  }
}
