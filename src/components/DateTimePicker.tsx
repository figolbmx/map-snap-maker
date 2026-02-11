import { Calendar, Clock } from 'lucide-react';
import type { DateTimeData } from '@/types/geotag';
import { TIMEZONES } from '@/lib/dateUtils';

interface DateTimePickerProps {
  dateTime: DateTimeData;
  onChange: (dt: DateTimeData) => void;
}

export default function DateTimePicker({ dateTime, onChange }: DateTimePickerProps) {
  const dateStr = dateTime.date.toISOString().split('T')[0];
  const timeStr = `${String(dateTime.date.getHours()).padStart(2, '0')}:${String(dateTime.date.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="card-elevated p-4 animate-fade-in">
      <h3 className="section-title flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Tanggal & Waktu
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tanggal</label>
          <div className="relative">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => {
                const newDate = new Date(dateTime.date);
                const parts = e.target.value.split('-');
                newDate.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                onChange({ ...dateTime, date: newDate });
              }}
              className="w-full input-dark rounded-lg px-3 py-2.5 text-sm appearance-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Waktu</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="time"
              value={timeStr}
              onChange={(e) => {
                const newDate = new Date(dateTime.date);
                const [h, m] = e.target.value.split(':');
                newDate.setHours(parseInt(h), parseInt(m));
                onChange({ ...dateTime, date: newDate });
              }}
              className="w-full input-dark rounded-lg pl-9 pr-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Timezone</label>
          <select
            value={dateTime.timezoneOffset}
            onChange={(e) => onChange({ ...dateTime, timezoneOffset: e.target.value })}
            className="w-full input-dark rounded-lg px-3 py-2.5 text-sm appearance-none cursor-pointer"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
