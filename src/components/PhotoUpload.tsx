import { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface PhotoUploadProps {
  onImageLoad: (img: HTMLImageElement, file: File, url: string) => void;
  imageUrl: string | null;
  onClear: () => void;
}

export default function PhotoUpload({ onImageLoad, imageUrl, onClear }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => onImageLoad(img, file, url);
      img.src = url;
    },
    [onImageLoad]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="card-elevated p-4 animate-fade-in">
      <h3 className="section-title flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        Upload Foto
      </h3>

      {imageUrl ? (
        <div className="relative group">
          <img
            src={imageUrl}
            alt="Uploaded"
            className="w-full rounded-lg object-cover max-h-48"
          />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">Klik atau drag foto ke sini</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG — resolusi asli dipertahankan</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
