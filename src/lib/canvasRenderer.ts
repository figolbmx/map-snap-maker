import { LocationData, DateTimeData, ProSettings, WeatherData } from '@/types/geotag';
import { getApiKey } from '@/lib/googleMaps';
import { formatDateTime } from '@/lib/dateUtils';

/**
 * Layout: Bottom of image — full-width bar
 * [Mini Map] [Address + Date/Time] [Weather Icon + Temps]
 * Background: 70% transparent gray
 */

export async function renderGeoTagImage(
  image: HTMLImageElement,
  location: LocationData,
  dateTime: DateTimeData,
  proSettings: ProSettings,
  weatherData?: WeatherData
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateCrop(image.naturalWidth, image.naturalHeight);

  canvas.width = dw;
  canvas.height = dh;
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

  const font = new FontFace('Rubik', 'url(/font/rubik_regular.ttf)');
  await font.load();
  document.fonts.add(font);

  await drawOverlay(ctx, canvas.width, canvas.height, location, dateTime, proSettings, false, weatherData);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
  });
}

export async function renderPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  location: LocationData,
  dateTime: DateTimeData,
  proSettings: ProSettings,
  weatherData?: WeatherData
): Promise<void> {
  const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateCrop(image.naturalWidth, image.naturalHeight);

  // Create an offscreen canvas to prevent flickering/piling up
  const offscreen = document.createElement('canvas');
  offscreen.width = dw;
  offscreen.height = dh;
  const oCtx = offscreen.getContext('2d')!;

  // 1. Draw base image
  oCtx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

  // 2. Load and add font
  const font = new FontFace('Rubik', 'url(/font/rubik_regular.ttf)');
  await font.load();
  document.fonts.add(font);

  // 3. Draw overlay on offscreen canvas
  await drawOverlay(oCtx, dw, dh, location, dateTime, proSettings, false, weatherData);

  // 4. Finally, copy offscreen to the main canvas in one go
  // This ensures no semi-transparent stacking if multiple draws overlap
  const ctx = canvas.getContext('2d')!;
  canvas.width = dw;
  canvas.height = dh;
  ctx.drawImage(offscreen, 0, 0);
}

function calculateCrop(srcW: number, srcH: number) {
  const isLandscape = srcW >= srcH;
  const targetRatio = isLandscape ? 4 / 3 : 3 / 4;
  const srcRatio = srcW / srcH;

  let sw = srcW;
  let sh = srcH;
  let sx = 0;
  let sy = 0;

  if (isLandscape) {
    if (srcRatio > targetRatio) {
      sw = srcH * targetRatio;
      sx = (srcW - sw) / 2;
    } else if (srcRatio < targetRatio) {
      sh = srcW / targetRatio;
      sy = (srcH - sh) / 2;
    }
  } else {
    if (srcRatio < targetRatio) {
      sh = srcW / targetRatio;
      sy = (srcH - sh) / 2;
    } else if (srcRatio > targetRatio) {
      sw = srcH * targetRatio;
      sx = (srcW - sw) / 2;
    }
  }

  return {
    sx, sy, sw, sh,
    dx: 0, dy: 0, dw: sw, dh: sh
  };
}

async function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  location: LocationData,
  dateTime: DateTimeData,
  proSettings: ProSettings,
  isPreview: boolean,
  weatherData?: WeatherData
) {
  const scale = Math.max(canvasW / 1080, isPreview ? 0.5 : 0.8);
  const isLandscape = canvasW >= canvasH;

  // ── Dimensions ──
  const overlayHeight = isLandscape
    ? Math.round(canvasH * 0.33)
    : Math.round(canvasW * 0.245);
  const padding = Math.round(16 * scale);
  const gap = Math.round(10 * scale);

  // Overlay spans full width, flush to edges and bottom
  const overlayWidth = canvasW;
  const overlayLeft = 0;
  const overlayTop = canvasH - overlayHeight;

  // ── Column widths ──
  const miniMapWidth = Math.round(overlayHeight * 1.01);
  const miniMapHeight = overlayHeight;
  const weatherColWidth = weatherData ? Math.round(overlayWidth * 0.1) : 0;
  const centerColWidth = overlayWidth - miniMapWidth - weatherColWidth - gap * (weatherData ? 2 : 1);

  // ── Background: 70% transparent gray, no rounded corners ──
  ctx.save();
  ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
  ctx.fillRect(overlayLeft, overlayTop, overlayWidth, overlayHeight);
  ctx.restore();

  // ════════════════════════════════════════════════
  // COLUMN 1 — Mini Map (left)
  // ════════════════════════════════════════════════
  const mmX = overlayLeft;
  const mmY = overlayTop;
  const mapBorderRadius = 0;

  try {
    const mapImg = await loadStaticMap(location.lat, location.lng, miniMapWidth, miniMapHeight, scale, proSettings.mapType);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mmX, mmY, miniMapWidth, miniMapHeight);
    ctx.beginPath();
    ctx.rect(mmX, mmY, miniMapWidth, miniMapHeight);
    ctx.clip();

    // Zoom slightly to hide "Terms of Use" and "Map Data" at the edges
    const zoomFactor = 1.15;
    const sizeW = miniMapWidth * zoomFactor;
    const sizeH = miniMapHeight * zoomFactor;
    const offsetW = (sizeW - miniMapWidth) / 2;
    const offsetH = (sizeH - miniMapHeight) / 2;
    ctx.drawImage(mapImg, mmX - offsetW, mmY - offsetH, sizeW, sizeH);

    // Custom Google logo (since original is cropped)
    const logoFontSize = Math.round(10 * scale);
    ctx.font = `500 ${logoFontSize}px "Roboto", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const logoX = mmX + 8 * scale;
    const logoY = mmY + miniMapHeight - 6 * scale;

    if (proSettings.mapType === 'satellite') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4 * scale;
      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineJoin = 'round';
      ctx.strokeText('Google', logoX, logoY);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Google', logoX, logoY);
    } else {
      const colors = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335'];
      const text = 'Google';
      let currentX = logoX;
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
  } catch {
    ctx.save();
    ctx.fillStyle = '#e8e4d8';
    roundRect(ctx, mmX, mmY, miniMapWidth, miniMapHeight, {
      tl: mapBorderRadius, tr: 0, br: 0, bl: mapBorderRadius,
    });
    ctx.fill();
    ctx.fillStyle = '#999';
    ctx.font = `${Math.round(12 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Map', mmX + miniMapWidth / 2, mmY + miniMapHeight / 2 + 4 * scale);
    ctx.restore();
  }

  // ════════════════════════════════════════════════
  // COLUMN 2 — Address details (center)
  // ════════════════════════════════════════════════
  const centerX = overlayLeft + miniMapWidth + gap;
  const centerY = overlayTop;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';

  const centerMidX = centerX + centerColWidth / 2;

  // Font sizes
  const fontSizeFullAddr = Math.round(11 * scale);
  const fontSizeDistrict = Math.round(35 * scale);
  const fontSizeProvince = Math.round(35 * scale);
  const fontSizeCountry = Math.round(35 * scale);
  const fontSizeDateTime = Math.round(30 * scale);

  // Full address at the top (single line, small, may truncate)
  ctx.font = `200 ${fontSizeFullAddr}px "Roboto", sans-serif`;
  const fullAddrMaxW = centerColWidth - padding * 2;
  let fullAddrText = location.fullAddress;
  // Truncate if too long
  while (ctx.measureText(fullAddrText).width > fullAddrMaxW && fullAddrText.length > 10) {
    fullAddrText = fullAddrText.slice(0, -4) + '...';
  }
  const fullAddrY = centerY + Math.round(padding * 1.5) + fontSizeFullAddr;
  ctx.fillText(fullAddrText, centerMidX, fullAddrY);

  // Calculate remaining space for center content - removing separator line
  const contentTopY = fullAddrY + Math.round(16 * scale);
  // Date format: YYYY-MM-DD(Day) HH:mm
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = dateTime.date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dayName = DAYS_SHORT[d.getDay()];
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const dateTimeText = `${yyyy}-${mm}-${dd}(${dayName})  ${hh}:${min}`;
  const bottomY = centerY + overlayHeight - padding;

  // Available height for district/province/country + datetime
  const availableHeight = bottomY - contentTopY;

  // We have 3 lines: district, province, country (datetime moved to bottom)
  // Try to auto-scale to fit
  let textScaleFactor = 1.0;
  const totalNominal = fontSizeDistrict + fontSizeProvince + fontSizeCountry;
  const lineSpacing = Math.round(14 * scale);
  const totalWithSpacing = totalNominal + lineSpacing * 2;
  if (totalWithSpacing > availableHeight) {
    textScaleFactor = availableHeight / totalWithSpacing;
  }

  const scaledDistrict = Math.round(fontSizeDistrict * textScaleFactor);
  const scaledProvince = Math.round(fontSizeProvince * textScaleFactor);
  const scaledCountry = Math.round(fontSizeCountry * textScaleFactor);
  const scaledSpacing = Math.round(lineSpacing * textScaleFactor);

  const actualTotalH = scaledDistrict + scaledProvince + scaledCountry + scaledSpacing * 2;
  const startY = contentTopY + (availableHeight - actualTotalH) * 0.1;

  // District (Kec)
  let curY = startY + scaledDistrict;
  ctx.font = `400 ${scaledDistrict}px "Roboto", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(location.district || location.city || 'Kec', centerMidX, curY);

  // Province (Jawa Tengah)
  curY += scaledSpacing + scaledProvince;
  ctx.font = `400 ${scaledProvince}px "Roboto", sans-serif`;
  ctx.fillText(location.province, centerMidX, curY);

  // Country (Indonesia) + Flag
  curY += scaledSpacing + scaledCountry;
  ctx.font = `400 ${scaledCountry}px "Roboto", sans-serif`;
  const countryText = location.country;
  ctx.fillText(countryText, centerMidX, curY);


  ctx.restore();

  // ════════════════════════════════════════════════
  // Date/Time — bottom center of entire overlay
  // ════════════════════════════════════════════════
  ctx.save();
  const dtFontSize = Math.round(fontSizeDateTime * textScaleFactor);
  const dtBottomPad = Math.round(8 * scale);
  const dtY = overlayTop + overlayHeight - dtBottomPad;
  ctx.font = `400 ${dtFontSize}px "Roboto", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(dateTimeText, centerX + centerColWidth / 2, dtY);
  ctx.restore();

  // ════════════════════════════════════════════════
  // COLUMN 3 — Weather (right)
  // ════════════════════════════════════════════════
  if (weatherData && weatherColWidth > 0) {
    const weatherX = overlayLeft + overlayWidth - weatherColWidth;
    const weatherY = overlayTop;
    const rightPadding = Math.round(20 * scale);
    const weatherAnchorX = overlayLeft + overlayWidth - rightPadding; // right-aligned anchor

    ctx.save();

    // Weather icon
    const iconSize = Math.round(overlayHeight * 0.38);
    const iconY = weatherY + padding;
    try {
      const weatherIcon = await loadWeatherIcon(weatherData.iconUrl);
      ctx.drawImage(weatherIcon, weatherAnchorX - iconSize, iconY, iconSize, iconSize);
    } catch {
      // Draw fallback weather symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = `${iconSize}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      const fallbackEmoji = getWeatherEmoji(weatherData.weatherCode);
      ctx.fillText(fallbackEmoji, weatherAnchorX, iconY);
    }

    // Temperature — positioned from bottom of overlay
    const tempFontSizeC = Math.round(50 * scale);
    const tempFontSizeF = Math.round(50 * scale);
    const bottomPadding = Math.round(9 * scale);
    const tempGap = Math.round(4 * scale);

    // °F at the bottom
    const tempFY = weatherY + overlayHeight - bottomPadding - tempFontSizeF;
    // °C above °F
    const tempCY = tempFY - tempGap - tempFontSizeC;

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = `350 ${tempFontSizeC}px "Roboto", sans-serif`;
    ctx.fillText(`${weatherData.temperatureC}°C`, weatherAnchorX, tempCY);

    // Temperature in °F
    ctx.font = `350 ${tempFontSizeF}px "Roboto", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`${weatherData.temperatureF}°F`, weatherAnchorX, tempFY);

    ctx.restore();
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

function loadStaticMap(lat: number, lng: number, width: number, height: number, scale: number, mapType: 'satellite' | 'roadmap'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      reject(new Error('No API key'));
      return;
    }

    const pixelW = Math.max(Math.round(width / scale), 100);
    const pixelH = Math.max(Math.round(height / scale), 100);
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=13&size=${pixelW}x${pixelH}&scale=2&maptype=${mapType}&markers=${lat},${lng}&key=${apiKey}`;

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
    img.src = '/icon.png';
  });
}

function loadWeatherIcon(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌧️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  return '⛈️';
}

function loadFlagImage(countryCode: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!countryCode) return reject(new Error('No country code'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Flag not found for ${countryCode}`));

    const cc = countryCode.toUpperCase();
    const codes = [...cc].map((c) => (0x1f1e6 + c.charCodeAt(0) - 65).toString(16));
    const filename = 'u' + codes.join('_');
    img.src = `/flags/${filename}.png`;
  });
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode) return '';
  const cc = countryCode.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
