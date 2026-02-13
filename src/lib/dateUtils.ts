const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_SHORT = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

export function formatDateTime(date: Date, timezoneOffset: string, use24h: boolean): string {
  const dayName = DAYS[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = MONTHS_SHORT[date.getMonth()];
  const yyyy = date.getFullYear();

  if (use24h) {
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dayName}, ${dd}/${mm}/${yyyy} ${hh}:${min} GMT ${timezoneOffset}`;
  } else {
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hh = String(hours).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dayName}, ${dd}/${mm}/${yyyy} ${hh}:${min} ${ampm} GMT ${timezoneOffset}`;
  }
}

export const TIMEZONES = [
  { label: 'GMT -12:00', value: '-12:00' },
  { label: 'GMT -11:00', value: '-11:00' },
  { label: 'GMT -10:00', value: '-10:00' },
  { label: 'GMT -09:00', value: '-09:00' },
  { label: 'GMT -08:00', value: '-08:00' },
  { label: 'GMT -07:00', value: '-07:00' },
  { label: 'GMT -06:00', value: '-06:00' },
  { label: 'GMT -05:00', value: '-05:00' },
  { label: 'GMT -04:00', value: '-04:00' },
  { label: 'GMT -03:00', value: '-03:00' },
  { label: 'GMT -02:00', value: '-02:00' },
  { label: 'GMT -01:00', value: '-01:00' },
  { label: 'GMT +00:00', value: '+00:00' },
  { label: 'GMT +01:00', value: '+01:00' },
  { label: 'GMT +02:00', value: '+02:00' },
  { label: 'GMT +03:00', value: '+03:00' },
  { label: 'GMT +04:00', value: '+04:00' },
  { label: 'GMT +05:00', value: '+05:00' },
  { label: 'GMT +05:30', value: '+05:30' },
  { label: 'GMT +06:00', value: '+06:00' },
  { label: 'GMT +07:00 (WIB)', value: '+07:00' },
  { label: 'GMT +08:00 (WITA)', value: '+08:00' },
  { label: 'GMT +09:00 (WIT)', value: '+09:00' },
  { label: 'GMT +10:00', value: '+10:00' },
  { label: 'GMT +11:00', value: '+11:00' },
  { label: 'GMT +12:00', value: '+12:00' },
];
