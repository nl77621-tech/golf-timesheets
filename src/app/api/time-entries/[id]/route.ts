import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDuration } from '@/lib/timeCalc'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  let hours = body.hours
  let minutes = body.minutes
  if (!body.isAdmin && body.clockIn && body.clockOut) {
    const duration = calculateDuration(body.clockIn, body.clockOut)
    hours = duration.hours
    minutes = duration.minutes
  }

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
      hours,
      minutes,
    },
  })
  return NextResponse.json(entry)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.timeEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
