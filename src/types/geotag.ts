export interface LocationData {
  lat: number;
  lng: number;
  district: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  fullAddress: string;
}

export interface DateTimeData {
  date: Date;
  timezone: string;
  timezoneOffset: string;
  use24h: boolean;
}

export interface ProSettings {
  showLatLong: boolean;
  showFullAddress: boolean;
  overlayOpacity: number;
  use24hFormat: boolean;
  watermarkText: string;
}

export interface GeoTagState {
  image: HTMLImageElement | null;
  imageFile: File | null;
  imageUrl: string | null;
  location: LocationData | null;
  dateTime: DateTimeData;
  proSettings: ProSettings;
}
