import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDuration } from '@/lib/timeCalc'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const payPeriodId = searchParams.get('payPeriodId')
  const employeeId = searchParams.get('employeeId')

  const where: Record<string, string> = {}
  if (payPeriodId) where.payPeriodId = payPeriodId
  if (employeeId) where.employeeId = employeeId

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { employee: true, payPeriod: true },
    orderBy: [{ date: 'asc' }],
  })
  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { employeeId, payPeriodId, date, clockIn, clockOut, isAdmin, adminHours, adminMinutes } = body

  let hours = 0
  let minutes = 0
  if (!isAdmin && clockIn && clockOut) {
    const duration = calculateDuration(clockIn, clockOut)
    hours = duration.hours
    minutes = duration.minutes
  }

  const entry = await prisma.timeEntry.create({
    data: {
      employeeId,
      payPeriodId,
      date: date ? new Date(date) : null,
      clockIn: isAdmin ? null : clockIn,
      clockOut: isAdmin ? null : clockOut,
      hours,
      minutes,
      isAdmin: isAdmin || false,
      adminHours: isAdmin ? (adminHours || 0) : null,
      adminMinutes: isAdmin ? (adminMinutes || 0) : null,
    },
  })
  return NextResponse.json(entry)
}
