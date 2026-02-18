import { useState, useCallback } from 'react';
import { MapPin, Camera } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import MapSelector from '@/components/MapSelector';
import DateTimePicker from '@/components/DateTimePicker';
import ProSettingsPanel from '@/components/ProSettingsPanel';
import PreviewCanvas from '@/components/PreviewCanvas';
import type { LocationData, DateTimeData, ProSettings } from '@/types/geotag';
import { defaultLayoutSettings } from '@/types/geotag';

const defaultDateTime: DateTimeData = {
  date: new Date(),
  timezone: 'Asia/Jakarta',
  timezoneOffset: '+07:00',
  use24h: false,
};

const defaultProSettings: ProSettings = {
  showLatLong: true,
  showFullAddress: true,
  overlayOpacity: 70,
  use24hFormat: false,
  watermarkText: 'GPS Map Camera',
  mapType: 'satellite',
  layoutSettings: defaultLayoutSettings,
};

export default function Index() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [dateTime, setDateTime] = useState<DateTimeData>(defaultDateTime);
  const [proSettings, setProSettings] = useState<ProSettings>(defaultProSettings);

  const handleImageLoad = useCallback((img: HTMLImageElement, _file: File, url: string) => {
    setImage(img);
    setImageUrl(url);
  }, []);

  const handleClearImage = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImage(null);
    setImageUrl(null);
  }, [imageUrl]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center gps-glow">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground flex items-center gap-2">
              GeoTag Photo Generator
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                PRO
              </span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Generate foto dengan overlay GPS mirip GPS Map Camera
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Resolusi asli • Tanpa kompresi
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <PhotoUpload
              onImageLoad={handleImageLoad}
              imageUrl={imageUrl}
              onClear={handleClearImage}
            />
            <DateTimePicker dateTime={dateTime} onChange={setDateTime} />
            <MapSelector location={location} onLocationChange={setLocation} />
            <ProSettingsPanel settings={proSettings} onChange={setProSettings} />
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="lg:sticky lg:top-20">
              <PreviewCanvas
                image={image}
                location={location}
                dateTime={dateTime}
                proSettings={proSettings}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            GeoTag Photo Generator Pro — Buat overlay GPS pada foto Anda
          </p>
        </div>
      </footer>
    </div>
  );
}
