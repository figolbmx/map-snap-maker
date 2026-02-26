import { useState, useCallback } from 'react';
import { MapPin, Camera, Settings2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import PhotoUpload from '@/components/PhotoUpload';
import type { ImageItem } from '@/components/PhotoUpload';
import MapSelector from '@/components/MapSelector';
import DateTimePicker from '@/components/DateTimePicker';
import ProSettingsPanel from '@/components/ProSettingsPanel';
import TextSizePanel from '@/components/TextSizePanel';
import PreviewCanvas from '@/components/PreviewCanvas';
import LayoutSettingsPanel from '@/components/LayoutSettingsPanel';
import { defaultLayoutSettings } from '@/types/geotag';
import type { LocationData, DateTimeData, ProSettings } from '@/types/geotag';

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

export default function Editor() {
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
                URL.revokeObjectURL(prev[index].url);
                return prev.filter((_, i) => i !== index);
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

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
                    <Link to="/" className="p-2 hover:bg-secondary rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center gps-glow">
                        <Settings2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-foreground flex items-center gap-2">
                            Layout Editor
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                LABS
                            </span>
                        </h1>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            Kostumisasi ukuran dan proporsi infobox secara live
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Left Panel - Image & Map */}
                    <div className="xl:col-span-3 space-y-4">
                        <PhotoUpload
                            images={images}
                            activeIndex={activeIndex}
                            onImagesAdd={handleImagesAdd}
                            onRemove={handleRemove}
                            onSelect={setActiveIndex}
                            onClearAll={handleClearAll}
                        />
                        <MapSelector location={location} onLocationChange={setLocation} />
                        <ProSettingsPanel settings={proSettings} onChange={setProSettings} />
                        <TextSizePanel settings={proSettings} onChange={setProSettings} />
                        <DateTimePicker dateTime={activeDateTime} onChange={handleDateTimeChange} />
                    </div>

                    {/* Middle Panel - Preview */}
                    <div className="xl:col-span-6">
                        <div className="sticky top-20">
                            <PreviewCanvas
                                image={activeImage?.img ?? null}
                                location={location}
                                dateTime={activeDateTime}
                                proSettings={proSettings}
                                allImages={images}
                            />
                        </div>
                    </div>

                    {/* Right Panel - Layout Settings */}
                    <div className="xl:col-span-3">
                        <LayoutSettingsPanel settings={proSettings} onChange={setProSettings} />

                        <div className="card-elevated p-4 mt-4 bg-primary/5 border-primary/20">
                            <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Tips Editor
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
                                <li>Gunakan slider untuk mengubah ukuran box.</li>
                                <li>Teks akan otomatis melar (auto-scale) sesuai batas limit yang diatur.</li>
                                <li>Editor ini membantu Anda menemukan proporsi yang paling pas.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
