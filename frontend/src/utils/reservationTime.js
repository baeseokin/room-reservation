export const addOneHour = (time) => {
  if (!time) return ''
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min(24 * 60, hour * 60 + minute + 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const changeTimePart = (time, part, value, endOfDay = false) => {
  const [hour, minute] = (time || '09:00').split(':').map(Number)
  const period = part === 'period' ? value : (hour % 24 >= 12 ? 'PM' : 'AM')
  const hour12 = part === 'hour' ? Number(value) : (hour % 12 || 12)
  const nextMinute = part === 'minute' ? Number(value) : minute
  let nextHour = hour12 % 12 + (period === 'PM' ? 12 : 0)
  if (endOfDay && nextHour === 0 && nextMinute === 0) nextHour = 24
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`
}
