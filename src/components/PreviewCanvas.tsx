import { useEffect, useRef, useCallback, useState } from 'react';
import { Download, Loader2, Eye, Images } from 'lucide-react';
import { Button, Progress } from '@nextui-org/react';
import type { LocationData, DateTimeData, ProSettings } from '@/types/geotag';
import type { ImageItem } from '@/components/PhotoUpload';
import { renderPreview, renderGeoTagImage } from '@/lib/canvasRenderer';

interface PreviewCanvasProps {
  image: HTMLImageElement | null;
  location: LocationData | null;
  dateTime: DateTimeData;
  proSettings: ProSettings;
  allImages?: ImageItem[];
}

export default function PreviewCanvas({ image, location, dateTime, proSettings, allImages = [] }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const renderIdRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current || !image || !location) return;

    const currentId = ++renderIdRef.current;

    const safeRender = async () => {
      await renderPreview(canvasRef.current!, image, location, dateTime, proSettings);
    };

    safeRender();
  }, [image, location, dateTime, proSettings]);

  const getFilename = useCallback((index?: number) => {
    const d = new Date(dateTime.date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const suffix = index !== undefined ? `_${pad(index + 1)}` : '';
    return `${year}${month}${day}_${hours}${minutes}ByGPSMapCamera${suffix}.jpg`;
  }, [dateTime.date]);

  const handleDownload = useCallback(async () => {
    if (!image || !location) return;
    setDownloading(true);
    try {
      const blob = await renderGeoTagImage(image, location, dateTime, proSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename();
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  }, [image, location, dateTime, proSettings, getFilename]);

  const handleDownloadCompressed = useCallback(async () => {
    if (!image || !location) return;
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const getBlob = async (quality: number, scale = 1.0): Promise<Blob> => {
        const tempCanvas = document.createElement('canvas');
        await renderPreview(tempCanvas, image, location, dateTime, proSettings);

        let finalCanvas = tempCanvas;
        if (scale < 1) {
          finalCanvas = document.createElement('canvas');
          finalCanvas.width = tempCanvas.width * scale;
          finalCanvas.height = tempCanvas.height * scale;
          const finalCtx = finalCanvas.getContext('2d');
          if (finalCtx) {
            finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
          }
        }

        return new Promise((resolve) => {
          finalCanvas.toBlob((blob) => {
            resolve(blob!);
          }, 'image/jpeg', quality);
        });
      };

      let quality = 0.8;
      let scale = 1.0;
      let blob = await getBlob(quality, scale);

      while (blob.size > 500 * 1024 && (quality > 0.1 || scale > 0.3)) {
        if (quality > 0.3) {
          quality -= 0.1;
        } else {
          scale -= 0.1;
        }
        blob = await getBlob(quality, scale);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename();
      a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Compression error:', err);
      alert('Gagal mengompres gambar');
    } finally {
      setDownloading(false);
    }
  }, [image, location, dateTime, proSettings, getFilename]);

  const handleDownloadAll = useCallback(async () => {
    if (!location || allImages.length === 0) return;
    setDownloading(true);
    setBatchProgress({ current: 0, total: allImages.length });

    try {
      for (let i = 0; i < allImages.length; i++) {
        setBatchProgress({ current: i + 1, total: allImages.length });
        const blob = await renderGeoTagImage(allImages[i].img, location, dateTime, proSettings);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFilename(i);
        a.click();
        URL.revokeObjectURL(url);
        // Small delay to prevent browser blocking multiple downloads
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      console.error('Batch download error:', err);
      alert('Gagal memproses batch download');
    } finally {
      setDownloading(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  }, [allImages, location, dateTime, proSettings, getFilename]);

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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="section-title mb-0 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Preview Hasil
        </h3>
        <div className="flex gap-2 flex-wrap">
          {allImages.length > 1 && (
            <Button
              size="sm"
              color="success"
              variant="solid"
              startContent={!downloading && <Images className="w-4 h-4" />}
              isLoading={downloading && batchProgress.total > 0}
              isDisabled={downloading}
              onPress={handleDownloadAll}
            >
              {downloading && batchProgress.total > 0
                ? `${batchProgress.current}/${batchProgress.total}`
                : `Download All (${allImages.length})`
              }
            </Button>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 animate-pulse-glow"
          >
            {downloading && batchProgress.total === 0 ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading && batchProgress.total === 0 ? 'Processing...' : 'Download HD'}
          </button>

          <button
            onClick={handleDownloadCompressed}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50 border border-border"
          >
            {downloading && batchProgress.total === 0 ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading && batchProgress.total === 0 ? 'Processing...' : 'Download (< 500KB)'}
          </button>
        </div>
      </div>

      {/* Batch Progress Bar */}
      {downloading && batchProgress.total > 0 && (
        <div className="mb-4">
          <Progress
            size="sm"
            value={(batchProgress.current / batchProgress.total) * 100}
            color="success"
            label={`Memproses foto ${batchProgress.current} dari ${batchProgress.total}`}
            showValueLabel
            className="max-w-full"
          />
        </div>
      )}

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
