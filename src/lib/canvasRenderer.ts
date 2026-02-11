import { LocationData, DateTimeData, ProSettings } from '@/types/geotag';
import { getApiKey } from '@/lib/googleMaps';
import { formatDateTime } from '@/lib/dateUtils';

export async function renderGeoTagImage(
  image: HTMLImageElement,
  location: LocationData,
  dateTime: DateTimeData,
  proSettings: ProSettings
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  // Draw original image
  ctx.drawImage(image, 0, 0);

  const scale = Math.max(canvas.width / 1200, 1);
  const overlayMargin = Math.round(20 * scale);
  const overlayPadding = Math.round(16 * scale);
  const miniMapSize = Math.round(140 * scale);
  const gap = Math.round(14 * scale);

  // Calculate text metrics for dynamic height
  const fontSizeTitle = Math.round(18 * scale);
  const fontSizeBody = Math.round(13 * scale);
  const fontSizeWatermark = Math.round(11 * scale);
  const lineHeight = 1.5;

  // Build text lines
  const flag = getFlagEmoji(location.countryCode);
  const titleLine = `${location.district}, ${location.province}, ${location.country} ${flag}`;

  const lines: { text: string; fontSize: number; bold: boolean }[] = [
    { text: titleLine, fontSize: fontSizeTitle, bold: true },
  ];

  if (proSettings.showFullAddress) {
    lines.push({ text: location.fullAddress, fontSize: fontSizeBody, bold: false });
  }

  if (proSettings.showLatLong) {
    lines.push({
      text: `Lat ${location.lat.toFixed(6)}° Long ${location.lng.toFixed(6)}°`,
      fontSize: fontSizeBody,
      bold: false,
    });
  }

  lines.push({
    text: formatDateTime(dateTime.date, dateTime.timezoneOffset, proSettings.use24hFormat),
    fontSize: fontSizeBody,
    bold: false,
  });

  // Measure text area width
  const maxTextWidth = canvas.width - overlayMargin * 2 - overlayPadding * 2 - miniMapSize - gap - overlayPadding;

  // Calculate needed height
  let totalTextHeight = 0;
  for (const line of lines) {
    ctx.font = `${line.bold ? '700' : '400'} ${line.fontSize}px Inter, sans-serif`;
    const words = line.text.split(' ');
    let currentLine = '';
    let wrappedLines = 0;
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
        wrappedLines++;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    wrappedLines++;
    totalTextHeight += wrappedLines * line.fontSize * lineHeight;
  }

  const overlayContentHeight = Math.max(miniMapSize, totalTextHeight);
  const overlayHeight = overlayContentHeight + overlayPadding * 2;
  const overlayWidth = canvas.width - overlayMargin * 2;
  const overlayX = overlayMargin;
  const overlayY = canvas.height - overlayMargin - overlayHeight;

  // Draw overlay background
  const opacity = proSettings.overlayOpacity / 100;
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.85})`;
  roundRect(ctx, overlayX, overlayY, overlayWidth, overlayHeight, 16 * scale);
  ctx.fill();

  // Draw mini map
  const miniMapX = overlayX + overlayPadding;
  const miniMapY = overlayY + overlayPadding;

  try {
    const mapImg = await loadStaticMap(location.lat, location.lng, miniMapSize, scale);
    ctx.save();
    roundRect(ctx, miniMapX, miniMapY, miniMapSize, miniMapSize, 12 * scale);
    ctx.clip();
    ctx.drawImage(mapImg, miniMapX, miniMapY, miniMapSize, miniMapSize);
    ctx.restore();
  } catch {
    // Fallback: draw placeholder map
    ctx.save();
    ctx.fillStyle = '#2d5016';
    roundRect(ctx, miniMapX, miniMapY, miniMapSize, miniMapSize, 12 * scale);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(10 * scale)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Map', miniMapX + miniMapSize / 2, miniMapY + miniMapSize / 2 + 4 * scale);
    ctx.restore();
  }

  // Draw text
  const textX = miniMapX + miniMapSize + gap;
  let textY = overlayY + overlayPadding + fontSizeTitle;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';

  for (const line of lines) {
    ctx.font = `${line.bold ? '700' : '400'} ${line.fontSize}px Inter, sans-serif`;

    // Word wrap
    const words = line.text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
        ctx.fillText(currentLine, textX, textY);
        textY += line.fontSize * lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    ctx.fillText(currentLine, textX, textY);
    textY += line.fontSize * lineHeight;
  }

  // Watermark
  if (proSettings.watermarkText) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.font = `500 ${fontSizeWatermark}px Inter, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(
      proSettings.watermarkText,
      overlayX + overlayWidth - overlayPadding,
      overlayY + overlayPadding + fontSizeWatermark
    );
    ctx.restore();
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadStaticMap(lat: number, lng: number, size: number, scale: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      reject(new Error('No API key'));
      return;
    }

    const pixelSize = Math.round(size / scale);
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=${pixelSize}x${pixelSize}&scale=2&markers=color:red%7C${lat},${lng}&key=${apiKey}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode) return '';
  const cc = countryCode.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// Preview version that draws on a provided canvas
export async function renderPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  location: LocationData,
  dateTime: DateTimeData,
  proSettings: ProSettings
): Promise<void> {
  const ctx = canvas.getContext('2d')!;

  // Scale to fit preview
  const maxW = canvas.parentElement?.clientWidth || 600;
  const ratio = image.naturalWidth / image.naturalHeight;
  const displayW = Math.min(maxW, image.naturalWidth);
  const displayH = displayW / ratio;

  canvas.width = displayW;
  canvas.height = displayH;

  ctx.drawImage(image, 0, 0, displayW, displayH);

  const scale = Math.max(displayW / 1200, 0.5);
  const overlayMargin = Math.round(12 * scale);
  const overlayPadding = Math.round(12 * scale);
  const miniMapSize = Math.round(100 * scale);
  const gap = Math.round(10 * scale);

  const fontSizeTitle = Math.round(14 * scale);
  const fontSizeBody = Math.round(10 * scale);
  const fontSizeWatermark = Math.round(8 * scale);
  const lineHeight = 1.5;

  const flag = getFlagEmoji(location.countryCode);
  const titleLine = `${location.district}, ${location.province}, ${location.country} ${flag}`;

  const textLines: { text: string; fontSize: number; bold: boolean }[] = [
    { text: titleLine, fontSize: fontSizeTitle, bold: true },
  ];

  if (proSettings.showFullAddress) {
    textLines.push({ text: location.fullAddress, fontSize: fontSizeBody, bold: false });
  }

  if (proSettings.showLatLong) {
    textLines.push({
      text: `Lat ${location.lat.toFixed(6)}° Long ${location.lng.toFixed(6)}°`,
      fontSize: fontSizeBody,
      bold: false,
    });
  }

  textLines.push({
    text: formatDateTime(dateTime.date, dateTime.timezoneOffset, proSettings.use24hFormat),
    fontSize: fontSizeBody,
    bold: false,
  });

  const maxTextWidth = displayW - overlayMargin * 2 - overlayPadding * 2 - miniMapSize - gap - overlayPadding;

  let totalTextHeight = 0;
  for (const line of textLines) {
    ctx.font = `${line.bold ? '700' : '400'} ${line.fontSize}px Inter, sans-serif`;
    const words = line.text.split(' ');
    let currentLine = '';
    let wLines = 0;
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(test).width > maxTextWidth && currentLine) {
        wLines++;
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    wLines++;
    totalTextHeight += wLines * line.fontSize * lineHeight;
  }

  const overlayContentH = Math.max(miniMapSize, totalTextHeight);
  const overlayH = overlayContentH + overlayPadding * 2;
  const overlayW = displayW - overlayMargin * 2;
  const overlayX = overlayMargin;
  const overlayY = displayH - overlayMargin - overlayH;

  const opacity = proSettings.overlayOpacity / 100;
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.85})`;
  roundRect(ctx, overlayX, overlayY, overlayW, overlayH, 10 * scale);
  ctx.fill();

  // Mini map placeholder for preview
  const mmX = overlayX + overlayPadding;
  const mmY = overlayY + overlayPadding;

  try {
    const mapImg = await loadStaticMap(location.lat, location.lng, miniMapSize, scale);
    ctx.save();
    roundRect(ctx, mmX, mmY, miniMapSize, miniMapSize, 8 * scale);
    ctx.clip();
    ctx.drawImage(mapImg, mmX, mmY, miniMapSize, miniMapSize);
    ctx.restore();
  } catch {
    ctx.save();
    ctx.fillStyle = '#3a7d44';
    roundRect(ctx, mmX, mmY, miniMapSize, miniMapSize, 8 * scale);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(8 * scale)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Map', mmX + miniMapSize / 2, mmY + miniMapSize / 2 + 3);
    ctx.restore();
  }

  const textX = mmX + miniMapSize + gap;
  let textY = overlayY + overlayPadding + fontSizeTitle;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';

  for (const line of textLines) {
    ctx.font = `${line.bold ? '700' : '400'} ${line.fontSize}px Inter, sans-serif`;
    const words = line.text.split(' ');
    let currentLine = '';
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(test).width > maxTextWidth && currentLine) {
        ctx.fillText(currentLine, textX, textY);
        textY += line.fontSize * lineHeight;
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    ctx.fillText(currentLine, textX, textY);
    textY += line.fontSize * lineHeight;
  }

  if (proSettings.watermarkText) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.font = `500 ${fontSizeWatermark}px Inter, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(
      proSettings.watermarkText,
      overlayX + overlayW - overlayPadding,
      overlayY + overlayPadding + fontSizeWatermark
    );
    ctx.restore();
  }
}
