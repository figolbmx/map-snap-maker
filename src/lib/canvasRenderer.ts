import { LocationData, DateTimeData, ProSettings } from '@/types/geotag';
import { getApiKey } from '@/lib/googleMaps';
import { formatDateTime } from '@/lib/dateUtils';

/**
 * Layout: Bottom of image
 * [Mini Map (no dark bg)] [Dark info box with text + watermark]
 * Map sits to the left, dark rounded box to the right.
 */

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
  ctx.drawImage(image, 0, 0);

  await drawOverlay(ctx, canvas.width, canvas.height, location, dateTime, proSettings, false);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
  });
}

export async function renderPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  location: LocationData,
  dateTime: DateTimeData,
  proSettings: ProSettings
): Promise<void> {
  const ctx = canvas.getContext('2d')!;

  // Render at full resolution so overlay looks identical to download
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.drawImage(image, 0, 0);

  await drawOverlay(ctx, image.naturalWidth, image.naturalHeight, location, dateTime, proSettings, false);
}

async function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  location: LocationData,
  dateTime: DateTimeData,
  proSettings: ProSettings,
  isPreview: boolean
) {
  const scale = Math.max(canvasW / 1080, isPreview ? 0.5 : 0.8);

  const margin = Math.round(25 * scale);
  const padding = Math.round(18 * scale);
  const miniMapSize = Math.round(220 * scale);
  const gap = Math.round(10 * scale);
  const borderRadius = Math.round(16 * scale);
  const mapBorderRadius = Math.round(12 * scale);

  const fontSizeTitle = Math.round(26 * scale);
  const fontSizeBody = Math.round(18 * scale);
  const fontSizeWatermark = Math.round(13 * scale);
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

  // Total overlay width ~70% of canvas
  const overlayWidth = Math.round(canvasW * 0.82);
  const infoBoxWidth = overlayWidth - miniMapSize - gap;
  const textContentWidth = infoBoxWidth - padding * 2;

  // Watermark badge dimensions
  const wmBadgePadH = Math.round(10 * scale);
  const wmBadgePadV = Math.round(6 * scale);
  let wmBadgeW = 0;
  let wmBadgeH = 0;
  const wmText = proSettings.watermarkText ? `📷  ${proSettings.watermarkText}` : '📷  GPS Map Camera';
  ctx.font = `600 ${fontSizeWatermark}px "Segoe UI", Roboto, sans-serif`;
  wmBadgeW = ctx.measureText(wmText).width + wmBadgePadH * 2;
  wmBadgeH = fontSizeWatermark + wmBadgePadV * 2;

  // Measure text height
  let totalTextHeight = 0;
  const wrappedTextData: { lines: string[]; fontSize: number; bold: boolean }[] = [];

  for (const line of lines) {
    ctx.font = `${line.bold ? '700' : '400'} ${line.fontSize}px "Segoe UI", Roboto, sans-serif`;
    const wrapped = wrapText(ctx, line.text, textContentWidth);
    wrappedTextData.push({ lines: wrapped, fontSize: line.fontSize, bold: line.bold });
    totalTextHeight += wrapped.length * line.fontSize * lineHeight;
  }

  const infoBoxContentH = totalTextHeight + padding * 2;
  const targetHeight = Math.round(canvasH * 0.16);
  const infoBoxHeight = Math.max(targetHeight, infoBoxContentH);

  // Position: bottom-center of image
  const overlayLeft = Math.round((canvasW - overlayWidth) / 2);
  const overlayBottom = canvasH - margin;

  // Badge sits ABOVE the info box, top-right
  const badgeGap = Math.round(6 * scale);
  const badgeX = overlayLeft + miniMapSize + gap + infoBoxWidth - wmBadgeW;
  const badgeY = overlayBottom - infoBoxHeight - badgeGap - wmBadgeH;

  // Draw badge (separate small dark box above info box)
  ctx.save();
  ctx.fillStyle = 'rgba(50, 50, 50, 0.85)';
  roundRect(ctx, badgeX, badgeY, wmBadgeW, wmBadgeH, Math.round(6 * scale));
  ctx.fill();
  ctx.font = `600 ${fontSizeWatermark}px "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(wmText, badgeX + wmBadgeW / 2, badgeY + wmBadgePadV + fontSizeWatermark * 0.85);
  ctx.restore();

  // Info box (dark background) - right of map
  const infoBoxX = overlayLeft + miniMapSize + gap;
  const infoBoxY = overlayBottom - infoBoxHeight;

  const opacity = proSettings.overlayOpacity / 100;
  ctx.fillStyle = `rgba(50, 50, 50, ${opacity * 0.88})`;
  roundRect(ctx, infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, borderRadius);
  ctx.fill();

  // Mini map - left side, bottom-aligned with info box
  const mmX = overlayLeft;
  const mmY = overlayBottom - miniMapSize;

  try {
    const mapImg = await loadStaticMap(location.lat, location.lng, miniMapSize, scale);
    ctx.save();
    // White background behind map
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, mmX, mmY, miniMapSize, miniMapSize, mapBorderRadius);
    ctx.fill();
    roundRect(ctx, mmX, mmY, miniMapSize, miniMapSize, mapBorderRadius);
    ctx.clip();
    ctx.drawImage(mapImg, mmX, mmY, miniMapSize, miniMapSize);
    ctx.restore();
  } catch {
    ctx.save();
    ctx.fillStyle = '#e8e4d8';
    roundRect(ctx, mmX, mmY, miniMapSize, miniMapSize, mapBorderRadius);
    ctx.fill();
    ctx.fillStyle = '#999';
    ctx.font = `${Math.round(12 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Map', mmX + miniMapSize / 2, mmY + miniMapSize / 2 + 4 * scale);
    ctx.restore();
  }

  // Draw text inside info box - vertically centered
  const textX = infoBoxX + padding;
  const textBlockTop = infoBoxY + (infoBoxHeight - totalTextHeight) / 2;
  let textY = textBlockTop + wrappedTextData[0]?.fontSize * 0.9;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';

  for (const block of wrappedTextData) {
    ctx.font = `${block.bold ? '700' : '400'} ${block.fontSize}px "Segoe UI", Roboto, sans-serif`;
    for (const wLine of block.lines) {
      ctx.fillText(wLine, textX, textY);
      textY += block.fontSize * lineHeight;
    }
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const result: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      result.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) result.push(currentLine);
  return result;
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

    const pixelSize = Math.max(Math.round(size / scale), 100);
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=${pixelSize}x${pixelSize}&scale=2&markers=color:red%7C${lat},${lng}&key=${apiKey}`;

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
