import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const periods = await prisma.payPeriod.findMany({
    orderBy: { startDate: 'asc' },
  })
  return NextResponse.json(periods)
}
