import { formatWeekday, todayISO } from '../utils/datetime'

interface DateSelectProps {
  value: string
// onChange	props の名前。 (date: string)	引数を1つ取る。名前は date、型は文字列。void	何も返さない(返り値がない)URL を書き換える関数なので、返り値はない。
  onChange: (date: string) => void
  label?: string
}

export default function DateSelect({ value, onChange, label = "日付" }: DateSelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">{label}</label>
      {/* ↓v2-2により select から input に変更。スケジュール側と同じUI（曜日を右端に重ねる） */}
      <div className="relative">
        <input
          type="date"
          min={todayISO()}
          value={value}
          // onChnage値がかわったらこの処理を実行　という意味htmlではonchange ReactではonChange と書く
          onChange={(e) => onChange(e.target.value)}
          className="border p-2 rounded w-full"
        />
        {/* ↓日付の右側に、曜日と『今日』という表示をする */}
        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-gray-600 pointer-events-none">
          （{formatWeekday(value)}）
          {value === todayISO() && '今日'}
        </span>
      </div>
    </div>
  )
}
