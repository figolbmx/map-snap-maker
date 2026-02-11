import { Settings, Eye, EyeOff, Type } from 'lucide-react';
import type { ProSettings as ProSettingsType } from '@/types/geotag';

interface ProSettingsProps {
  settings: ProSettingsType;
  onChange: (s: ProSettingsType) => void;
}

export default function ProSettingsPanel({ settings, onChange }: ProSettingsProps) {
  return (
    <div className="card-elevated p-4 animate-fade-in">
      <h3 className="section-title flex items-center gap-2">
        <Settings className="w-4 h-4 text-primary" />
        Pro Settings
      </h3>

      <div className="space-y-4">
        <ToggleRow
          label="Tampilkan Lat/Long"
          active={settings.showLatLong}
          onToggle={() => onChange({ ...settings, showLatLong: !settings.showLatLong })}
        />

        <ToggleRow
          label="Tampilkan Alamat Lengkap"
          active={settings.showFullAddress}
          onToggle={() => onChange({ ...settings, showFullAddress: !settings.showFullAddress })}
        />

        <ToggleRow
          label="Format 24 Jam"
          active={settings.use24hFormat}
          onToggle={() => onChange({ ...settings, use24hFormat: !settings.use24hFormat })}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground">Opacity Overlay</span>
            <span className="text-xs text-primary font-mono">{settings.overlayOpacity}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            value={settings.overlayOpacity}
            onChange={(e) => onChange({ ...settings, overlayOpacity: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
          />
        </div>

        <div>
          <label className="text-sm text-foreground flex items-center gap-2 mb-2">
            <Type className="w-3.5 h-3.5 text-muted-foreground" />
            Watermark Text
          </label>
          <input
            type="text"
            value={settings.watermarkText}
            onChange={(e) => onChange({ ...settings, watermarkText: e.target.value })}
            placeholder="GPS Map Camera"
            className="w-full input-dark rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <div
      className="flex items-center justify-between cursor-pointer group"
      onClick={onToggle}
    >
      <span className="text-sm text-foreground">{label}</span>
      <button
        className={`relative w-10 h-5 rounded-full transition-colors ${
          active ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground shadow transition-transform ${
            active ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
        {active ? (
          <Eye className="absolute right-6 top-0.5 w-3.5 h-3.5 text-primary" />
        ) : (
          <EyeOff className="absolute right-6 top-0.5 w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
