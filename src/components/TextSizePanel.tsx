import { Accordion, AccordionItem, Slider } from '@nextui-org/react';
import { Type } from 'lucide-react';
import type { ProSettings as ProSettingsType } from '@/types/geotag';
import { defaultLayoutSettings } from '@/types/geotag';

interface TextSizePanelProps {
  settings: ProSettingsType;
  onChange: (s: ProSettingsType) => void;
}

export default function TextSizePanel({ settings, onChange }: TextSizePanelProps) {
  const ls = settings.layoutSettings || defaultLayoutSettings;

  const updateFontSize = (key: keyof typeof defaultLayoutSettings, value: number) => {
    onChange({
      ...settings,
      layoutSettings: { ...ls, [key]: value },
    });
  };

  return (
    <div className="card-elevated p-4 animate-fade-in">
      <Accordion
        isCompact
        defaultExpandedKeys={[]}
        className="-mx-2"
      >
        <AccordionItem
          key="text-size"
          aria-label="Ukuran Teks"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Type className="w-4 h-4 text-primary" />
              Ukuran Teks
            </span>
          }
        >
          <div className="space-y-5 pb-2">
            <Slider
              label="Judul"
              size="sm"
              step={1}
              minValue={10}
              maxValue={80}
              value={ls.fontSizeTitle}
              onChange={(val) => updateFontSize('fontSizeTitle', val as number)}
              className="max-w-full"
              renderValue={({ children }) => (
                <span className="text-xs text-primary font-mono">{children}px</span>
              )}
            />

            <Slider
              label="Body"
              size="sm"
              step={1}
              minValue={10}
              maxValue={60}
              value={ls.fontSizeBody}
              onChange={(val) => updateFontSize('fontSizeBody', val as number)}
              className="max-w-full"
              renderValue={({ children }) => (
                <span className="text-xs text-primary font-mono">{children}px</span>
              )}
            />

            <Slider
              label="Watermark"
              size="sm"
              step={1}
              minValue={8}
              maxValue={30}
              value={ls.fontSizeWatermark}
              onChange={(val) => updateFontSize('fontSizeWatermark', val as number)}
              className="max-w-full"
              renderValue={({ children }) => (
                <span className="text-xs text-primary font-mono">{children}px</span>
              )}
            />

            <div className="pt-2 border-t border-border">
              <Slider
                label="Opacity Overlay"
                size="sm"
                step={1}
                minValue={30}
                maxValue={100}
                value={settings.overlayOpacity}
                onChange={(val) => onChange({ ...settings, overlayOpacity: val as number })}
                className="max-w-full"
                renderValue={({ children }) => (
                  <span className="text-xs text-primary font-mono">{children}%</span>
                )}
              />
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
