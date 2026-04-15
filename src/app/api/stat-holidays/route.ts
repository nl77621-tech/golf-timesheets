import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const holidays = await prisma.statHoliday.findMany({
    orderBy: { date: 'asc' },
    include: {
      entries: {
        include: { employee: true },
        orderBy: { employee: { name: 'asc' } },
      },
    },
  })
  return NextResponse.json(holidays)
}
