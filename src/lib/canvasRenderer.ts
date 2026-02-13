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
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
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

  const margin = Math.round(10 * scale);
  const padding = Math.round(16 * scale);
  const miniMapSize = Math.round(180 * scale);
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

  // Watermark badge dimensions
  const wmBadgePadH = Math.round(10 * scale);
  const wmBadgePadV = Math.round(6 * scale);
  let wmBadgeW = 0;
  let wmBadgeH = 0;
  const wmText = proSettings.watermarkText ? proSettings.watermarkText : 'GPS Map Camera';
  ctx.font = `600 ${fontSizeWatermark}px "Roboto", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;

  // Icon dimensions
  const iconSize = Math.round(fontSizeWatermark * 1.5);
  const iconPadding = Math.round(4 * scale);

  wmBadgeW = iconSize + iconPadding + ctx.measureText(wmText).width + wmBadgePadH * 2;
  wmBadgeH = Math.max(fontSizeWatermark, iconSize) + wmBadgePadV * 2;

  // Calculate target height (22% of canvas)
  const targetHeight = Math.round(canvasH * 0.22);
  const infoBoxHeight = targetHeight;
  const maxTextHeight = infoBoxHeight - padding * 2;

  // Initial max width constraint (82% of canvas minus map and padding)
  const maxOverlayAllowed = Math.round(canvasW * 0.82);
  const maxInfoBoxWidth = maxOverlayAllowed - miniMapSize - gap;
  const maxTextContentWidth = maxInfoBoxWidth - padding * 2;

  // Measure text height and Width - with auto scaling
  let totalTextHeight = 0;
  let maxLineWidthFound = 0;
  let currentScaleFactor = 1.0;
  const minScaleFactor = 0.5; // Don't shrink below 50%
  let wrappedTextData: { lines: string[]; fontSize: number; bold: boolean }[] = [];

  // Loop to find best fit
  while (true) {
    wrappedTextData = [];
    totalTextHeight = 0;
    maxLineWidthFound = 0;

    for (const line of lines) {
      const scaledFontSize = Math.round(line.fontSize * currentScaleFactor);
      ctx.font = `400 ${scaledFontSize}px "Roboto", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      const wrapped = wrapText(ctx, line.text, maxTextContentWidth);
      wrappedTextData.push({ lines: wrapped, fontSize: scaledFontSize, bold: line.bold });
      totalTextHeight += wrapped.length * scaledFontSize * lineHeight;

      for (const wLine of wrapped) {
        const w = ctx.measureText(wLine).width;
        if (w > maxLineWidthFound) maxLineWidthFound = w;
      }
    }

    // Check if it fits
    if (totalTextHeight <= maxTextHeight || currentScaleFactor <= minScaleFactor) {
      break;
    }

    // Reduce scale and try again
    currentScaleFactor -= 0.05;
  }

  // Calculate dynamic widths based on content
  const contentWidth = maxTextContentWidth; // Force use full width
  const infoBoxWidth = maxInfoBoxWidth;
  const overlayWidth = maxOverlayAllowed;

  const infoBoxContentH = totalTextHeight + padding * 2;

  // Position: bottom-center of image
  const overlayLeft = Math.round((canvasW - overlayWidth) / 2);
  const overlayBottom = canvasH - margin;

  // Badge sits ABOVE the info box, top-right
  const badgeGap = 0;
  const badgeX = overlayLeft + miniMapSize + gap + infoBoxWidth - wmBadgeW;
  const badgeY = overlayBottom - infoBoxHeight - badgeGap - wmBadgeH;

  const opacity = proSettings.overlayOpacity / 100;
  // ctx.save(); // Removed globalAlpha
  // ctx.globalAlpha = opacity;

  // Draw badge (separate small dark box above info box)
  ctx.save();
  ctx.fillStyle = `rgba(50, 50, 50, ${opacity})`;
  const badgeR = Math.round(6 * scale);
  roundRect(ctx, badgeX, badgeY, wmBadgeW, wmBadgeH, { tl: badgeR, tr: badgeR, br: 0, bl: 0 });
  ctx.fill();
  ctx.font = `600 ${fontSizeWatermark}px "Roboto", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';

  // Draw Icon
  try {
    const iconImg = await loadBadgeIcon();
    ctx.drawImage(iconImg, badgeX + wmBadgePadH, badgeY + (wmBadgeH - iconSize) / 2, iconSize, iconSize);
  } catch (e) {
    // Fallback if icon fails
    console.error('Failed to load icon', e);
  }

  // Draw Text
  ctx.textBaseline = 'middle';
  ctx.fillText(wmText, badgeX + wmBadgePadH + iconSize + iconPadding, badgeY + wmBadgeH / 2);
  ctx.restore();

  // Info Box
  const infoBoxX = overlayLeft + miniMapSize + gap;
  const infoBoxY = overlayBottom - infoBoxHeight;

  // Use base color only, alpha is handled by globalAlpha
  ctx.fillStyle = `rgba(50, 50, 50, ${opacity})`;
  roundRect(ctx, infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, {
    tl: borderRadius,
    tr: 0,
    br: borderRadius,
    bl: borderRadius,
  });
  ctx.fill();

  // Mini Map
  const mmX = overlayLeft;
  const mmY = overlayBottom - miniMapSize;

  try {
    const mapImg = await loadStaticMap(location.lat, location.lng, miniMapSize, scale, proSettings.mapType);
    ctx.save();
    // White background behind map
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, mmX, mmY, miniMapSize, miniMapSize, mapBorderRadius);
    ctx.fill();
    roundRect(ctx, mmX, mmY, miniMapSize, miniMapSize, mapBorderRadius);
    ctx.clip();
    // Draw image slightly zoomed in to "crop" the Google logo at the bottom
    // We scale by 1.3x and shift it up slightly
    const zoomFactor = 1.5;
    const size = miniMapSize * zoomFactor;
    const offset = (size - miniMapSize) / 2;
    ctx.drawImage(mapImg, mmX - offset, mmY - offset, size, size);

    // Custom Google Logo (Re-added per user request)
    ctx.save();
    const logoFontSize = Math.round(30 * scale);
    ctx.font = `500 ${logoFontSize}px "Product Sans", "Roboto", "Arial", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    const logoX = mmX + 8 * scale;
    const logoY = mmY + miniMapSize - 6 * scale;

    if (proSettings.mapType === 'satellite') {
      // Satellite: White text with shadow and black outline
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4 * scale;

      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineJoin = 'round';
      ctx.strokeText('Google', logoX, logoY);

      ctx.fillStyle = '#ffffff';
      ctx.fillText('Google', logoX, logoY);
    } else {
      // Roadmap: Multi-colored Google logo
      const colors = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335'];
      const text = "Google";
      let currentX = logoX;

      // Add a subtle white outline for better contrast
      ctx.lineWidth = 2 * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineJoin = 'round';

      for (let i = 0; i < text.length; i++) {
        ctx.strokeText(text[i], currentX, logoY);
        ctx.fillStyle = colors[i];
        ctx.fillText(text[i], currentX, logoY);
        currentX += ctx.measureText(text[i]).width;
      }
    }
    ctx.restore();
    ctx.restore();

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
    ctx.font = `400 ${block.fontSize}px "Roboto", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    for (const wLine of block.lines) {
      ctx.fillText(wLine, textX, textY);
      textY += block.fontSize * lineHeight;
    }
  }

  // Restore opacity (Removed ctx.restore() matching the removed ctx.save())
  // ctx.restore();
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl: number; tr: number; br: number; bl: number }
) {
  const radius = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;

  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + w - radius.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius.tr);
  ctx.lineTo(x + w, y + h - radius.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius.br, y + h);
  ctx.lineTo(x + radius.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}

function loadStaticMap(lat: number, lng: number, size: number, scale: number, mapType: 'satellite' | 'roadmap'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      reject(new Error('No API key'));
      return;
    }

    const pixelSize = Math.max(Math.round(size / scale), 100);
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=${pixelSize}x${pixelSize}&scale=2&maptype=${mapType}&markers=${lat},${lng}&key=${apiKey}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function loadBadgeIcon(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = '/icon.png'; // Placeholder icon from public folder
  });
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode) return '';
  const cc = countryCode.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
