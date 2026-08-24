// 15分刻みの時刻スロット（00:00〜23:45）を生成
export const TIME_SLOTS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0")
  const m = String((i % 4) * 15).padStart(2, "0")
  return `${h}:${m}`
})

// 今日の日付をJSTで取得
export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

// 現在時刻をJSTで"HH:MM"形式で取得
export function currentTimeJST() {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })
}



// Date を 'YYYY-MM-DD' に戻す（todayISO() と同じ方式）
function toISO(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}


// ↓ver2で追加


// 'YYYY-MM-DD' を Date に変換（JSTの0時として解釈する）
function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00+09:00`)
}

// 'YYYY-MM-DD' を「8月7日(金)」形式に変換。今日なら末尾に「 今日」を付ける
export function formatDateLabel(iso: string): string {
  const label = parseISO(iso).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  return iso === todayISO() ? `${label} 今日` : label
}

// 'YYYY-MM-DD' から曜日だけを取り出す（'月' など）
export function formatWeekday(iso: string): string {
  return parseISO(iso).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short',
  })
}

// 今日から days 日分の選択肢を生成
export function buildDateOptions(days = 30): { value: string; label: string }[] {
  const base = parseISO(todayISO())
  return Array.from({ length: days }, (_, i) => {
    const value = toISO(new Date(base.getTime() + i * 86400000))
    return { value, label: formatDateLabel(value) }
  })
}
