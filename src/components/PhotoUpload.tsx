import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
import type { DateTimeData } from '@/types/geotag';

export interface ImageItem {
  img: HTMLImageElement;
  file: File;
  url: string;
  dateTime: DateTimeData;
}

interface PhotoUploadProps {
  images: ImageItem[];
  activeIndex: number;
  onImagesAdd: (items: ImageItem[]) => void;
  onRemove: (index: number) => void;
  onSelect: (index: number) => void;
  onClearAll: () => void;
}

export default function PhotoUpload({
  images,
  activeIndex,
  onImagesAdd,
  onRemove,
  onSelect,
  onClearAll,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);


  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const promises = imageFiles.map(
        (file) =>
          new Promise<ImageItem>((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve({ img, file, url });
            img.src = url;
          })
      );

      Promise.all(promises).then((items) => onImagesAdd(items));
    },
    [onImagesAdd]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="card-elevated p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title flex items-center gap-2 mb-0">
          <ImageIcon className="w-4 h-4 text-primary" />
          Upload Foto
          {images.length > 0 && (
            <span className="text-xs font-normal px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
              {images.length}
            </span>
          )}
        </h3>
        {images.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {/* Thumbnail Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {images.map((item, i) => (
            <div
              key={item.url}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square ${i === activeIndex
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-transparent hover:border-primary/40'
                }`}
              onClick={() => onSelect(i)}
            >
              <img
                src={item.url}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {i === activeIndex && (
                <div className="absolute top-1 left-1">
                  <CheckCircle2 className="w-4 h-4 text-primary drop-shadow-md" />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <label
        htmlFor="photo-upload-input"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`block border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${images.length > 0 ? 'p-4' : 'p-8'
          } ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }`}
      >
        <Upload className={`mx-auto mb-2 text-muted-foreground ${images.length > 0 ? 'w-5 h-5' : 'w-8 h-8 mb-3'}`} />
        <p className="text-sm text-foreground font-medium">
          {images.length > 0 ? 'Tambah foto lagi' : 'Klik atau drag foto ke sini'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG — bisa pilih banyak foto sekaligus
        </p>
      </label>

      <input
        id="photo-upload-input"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
