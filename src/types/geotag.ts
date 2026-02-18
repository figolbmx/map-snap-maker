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

export interface LayoutSettings {
  fontSizeTitle: number;
  fontSizeBody: number;
  fontSizeWatermark: number;
}

export const defaultLayoutSettings: LayoutSettings = {
  fontSizeTitle: 35,
  fontSizeBody: 25,
  fontSizeWatermark: 13,
};

export interface ProSettings {
  showLatLong: boolean;
  showFullAddress: boolean;
  overlayOpacity: number;
  use24hFormat: boolean;
  watermarkText: string;
  mapType: 'satellite' | 'roadmap';
  layoutSettings?: LayoutSettings;
}

export interface GeoTagState {
  image: HTMLImageElement | null;
  imageFile: File | null;
  imageUrl: string | null;
  location: LocationData | null;
  dateTime: DateTimeData;
  proSettings: ProSettings;
}
