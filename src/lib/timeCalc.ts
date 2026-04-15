export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null
  const parts = timeStr.split(':')
  if (parts.length < 2) return null
  return { hours: parseInt(parts[0], 10), minutes: parseInt(parts[1], 10) }
}

export function calculateDuration(
  clockIn: string,
  clockOut: string
): { hours: number; minutes: number } {
  const inTime = parseTime(clockIn)
  const outTime = parseTime(clockOut)
  if (!inTime || !outTime) return { hours: 0, minutes: 0 }

  let totalMinutes =
    outTime.hours * 60 + outTime.minutes - (inTime.hours * 60 + inTime.minutes)
  if (totalMinutes < 0) totalMinutes += 24 * 60

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}

export function totalToDecimal(hours: number, minutes: number): number {
  return Math.round((hours + minutes / 60) * 100) / 100
}

export function sumEntries(
  entries: Array<{ hours: number; minutes: number; isAdmin: boolean; adminHours?: number | null; adminMinutes?: number | null }>
): { hours: number; minutes: number; decimal: number } {
  let totalMinutes = 0
  for (const entry of entries) {
    if (entry.isAdmin) {
      totalMinutes += (entry.adminHours || 0) * 60 + (entry.adminMinutes || 0)
    } else {
      totalMinutes += entry.hours * 60 + entry.minutes
    }
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return { hours, minutes, decimal: totalToDecimal(hours, minutes) }
}
