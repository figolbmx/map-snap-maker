import { useEffect, useRef, useCallback, useState } from 'react';
import { Download, Loader2, Eye } from 'lucide-react';
import type { LocationData, DateTimeData, ProSettings } from '@/types/geotag';
import { renderPreview, renderGeoTagImage } from '@/lib/canvasRenderer';

interface PreviewCanvasProps {
  image: HTMLImageElement | null;
  location: LocationData | null;
  dateTime: DateTimeData;
  proSettings: ProSettings;
}

export default function PreviewCanvas({ image, location, dateTime, proSettings }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !image || !location) return;
    renderPreview(canvasRef.current, image, location, dateTime, proSettings);
  }, [image, location, dateTime, proSettings]);

  const handleDownload = useCallback(async () => {
    if (!image || !location) return;
    setDownloading(true);
    try {
      const blob = await renderGeoTagImage(image, location, dateTime, proSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `geotag_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  }, [image, location, dateTime, proSettings]);

  if (!image || !location) {
    return (
      <div className="card-elevated p-8 flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Eye className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Live Preview</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Upload foto dan pilih lokasi untuk melihat preview hasil GeoTag
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Preview Hasil
        </h3>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 animate-pulse-glow"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? 'Processing...' : 'Download PNG'}
        </button>
      </div>

      <div className="rounded-lg overflow-hidden border border-border bg-secondary/30">
        <canvas ref={canvasRef} className="w-full h-auto block" />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{image.naturalWidth} × {image.naturalHeight}px</span>
        <span>Resolusi asli dipertahankan</span>
      </div>
    </div>
  );
}
