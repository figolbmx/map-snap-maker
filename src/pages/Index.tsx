import { useState, useCallback } from 'react';
import { MapPin, Camera } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import type { ImageItem } from '@/components/PhotoUpload';
import MapSelector from '@/components/MapSelector';
import DateTimePicker from '@/components/DateTimePicker';
import ProSettingsPanel from '@/components/ProSettingsPanel';
import TextSizePanel from '@/components/TextSizePanel';
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
  showPlusCode: true,
  overlayOpacity: 70,
  use24hFormat: false,
  watermarkText: 'GPS Map Camera',
  mapType: 'satellite',
  layoutSettings: defaultLayoutSettings,
};

export default function Index() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [proSettings, setProSettings] = useState<ProSettings>(defaultProSettings);

  const activeImage = images[activeIndex] ?? null;
  const activeDateTime = activeImage?.dateTime ?? defaultDateTime;

  const handleImagesAdd = useCallback((items: ImageItem[]) => {
    setImages((prev) => {
      const itemsWithDateTime = items.map((item) => ({
        ...item,
        dateTime: { ...defaultDateTime, date: new Date() },
      }));
      const next = [...prev, ...itemsWithDateTime];
      if (prev.length === 0) setActiveIndex(0);
      return next;
    });
  }, []);

  const handleDateTimeChange = useCallback(
    (dt: DateTimeData) => {
      setImages((prev) =>
        prev.map((item, i) => (i === activeIndex ? { ...item, dateTime: dt } : item))
      );
    },
    [activeIndex]
  );

  const handleRemove = useCallback(
    (index: number) => {
      setImages((prev) => {
        const next = prev.filter((_, i) => i !== index);
        // Revoke the URL of the removed image
        URL.revokeObjectURL(prev[index].url);
        return next;
      });
      setActiveIndex((prev) => {
        if (images.length <= 1) return 0;
        if (index < prev) return prev - 1;
        if (index === prev) return Math.min(prev, images.length - 2);
        return prev;
      });
    },
    [images.length]
  );

  const handleClearAll = useCallback(() => {
    images.forEach((item) => URL.revokeObjectURL(item.url));
    setImages([]);
    setActiveIndex(0);
  }, [images]);

  const handleSelect = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

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
              GeoFuck - GeoTag Photo Generator
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
              images={images}
              activeIndex={activeIndex}
              onImagesAdd={handleImagesAdd}
              onRemove={handleRemove}
              onSelect={handleSelect}
              onClearAll={handleClearAll}
            />
            <DateTimePicker dateTime={activeDateTime} onChange={handleDateTimeChange} />
            <MapSelector location={location} onLocationChange={setLocation} />
            <ProSettingsPanel settings={proSettings} onChange={setProSettings} />
            <TextSizePanel settings={proSettings} onChange={setProSettings} />
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="lg:sticky lg:top-20">
              <PreviewCanvas
                image={activeImage?.img ?? null}
                location={location}
                dateTime={activeDateTime}
                proSettings={proSettings}
                allImages={images}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            ©️ figol - GeoTag Photo Generator Pro
          </p>
        </div>
      </footer>
    </div>
  );
}
