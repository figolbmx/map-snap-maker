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

  // Calculate Auto-Crop
  // Landscape: Enforce 4:3. If wider, crop sides.
  // Portrait: Enforce 3:4. If taller, crop top/bottom.
  const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateCrop(image.naturalWidth, image.naturalHeight);

  canvas.width = dw;
  canvas.height = dh;
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

  // Wait for font to load
  const font = new FontFace('Rubik', 'url(/font/rubik_regular.ttf)');
  await font.load();
  document.fonts.add(font);
  await document.fonts.load('400 20px "Noto Color Emoji"');


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
  const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateCrop(image.naturalWidth, image.naturalHeight);

  canvas.width = dw;
  canvas.height = dh;
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

  // Wait for font to load
  const font = new FontFace('Rubik', 'url(/font/rubik_regular.ttf)');
  await font.load();
  document.fonts.add(font);
  await document.fonts.load('400 20px "Noto Color Emoji"');


  await drawOverlay(ctx, dw, dh, location, dateTime, proSettings, false);
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
      // Too wide, crop width (sides)
      sw = srcH * targetRatio;
      sx = (srcW - sw) / 2;
    } else if (srcRatio < targetRatio) {
      // Too tall (closer to square), crop height (top/bottom) to match 4:3
      sh = srcW / targetRatio;
      sy = (srcH - sh) / 2;
    }
  } else {
    // Portrait
    if (srcRatio < targetRatio) {
      // Too tall, crop height (top/bottom)
      sh = srcW / targetRatio;
      sy = (srcH - sh) / 2;
    } else if (srcRatio > targetRatio) {
      // Too wide (closer to square), crop width (sides) to match 3:4
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
  isPreview: boolean
) {
  console.log('Using updated renderer v2 - with local flags');
  const scale = Math.max(canvasW / 1080, isPreview ? 0.5 : 0.8);
  const isLandscape = canvasW >= canvasH;

  const margin = isLandscape
    ? Math.round(15 * scale)
    : Math.round(20 * scale);
  const padding = Math.round(16 * scale);

  const gap = Math.round(15 * scale);
  const borderRadius = Math.round(16 * scale);
  const mapBorderRadius = Math.round(12 * scale);


  const ls = proSettings.layoutSettings;
  const fontSizeTitle = Math.round(20 * scale);
  const fontSizeBody = Math.round(15 * scale);
  const fontSizeWatermark = isLandscape
    ? Math.round(12.8 * scale)
    : Math.round(16 * scale);
  const lineHeight = 1.2;

  // Build text lines
  const titleBodyGap = Math.round(-5 * scale); // Jarak tambahan antara Title dan Body
  // Build text lines
  // const flag = getFlagEmoji(location.countryCode); // Removed font-based flag
  const titleLine = `${location.district}, ${location.province}, ${location.country}`;

  const lines: { text: string; fontSize: number; bold: boolean; hasFlag?: boolean }[] = [
    { text: titleLine, fontSize: fontSizeTitle, bold: false, hasFlag: true },
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
  // Calculate orientation and target height
  const targetHeight = isLandscape
    ? Math.round(canvasH * 0.248)
    : Math.round(canvasW * 0.245);
  const infoBoxHeight = targetHeight;

  // Watermark badge dimensions
  const wmBadgePadH = isLandscape
    ? Math.round(12 * scale)
    : Math.round(12 * scale);
  const wmBadgePadV = isLandscape
    ? Math.round(7 * scale)
    : Math.round(8 * scale);
  let wmBadgeW = 0;
  let wmBadgeH = 0;
  const wmText = proSettings.watermarkText ? proSettings.watermarkText : 'GPS Map Camera';
  // Prioritize Rubik, then Noto Color Emoji for colored flags
  ctx.font = `600 ${fontSizeWatermark}px "Roboto", sans-serif`;

  // Icon dimensions
  const iconSize = isLandscape
    ? Math.round(fontSizeWatermark * 1.8)
    : Math.round(fontSizeWatermark * 2.3);
  const iconPadding = isLandscape
    ? Math.round(5.5 * scale)
    : Math.round(10 * scale);

  wmBadgeW = iconSize + iconPadding + ctx.measureText(wmText).width + wmBadgePadH * 2;
  wmBadgeH = Math.max(fontSizeWatermark, iconSize) + wmBadgePadV * 2;

  const miniMapHeight = infoBoxHeight;
  const miniMapWidth = infoBoxHeight * 1.06;
  const maxTextHeight = infoBoxHeight - padding * 2;

  // Initial max width constraint
  const maxOverlayAllowed = isLandscape
    ? Math.round(canvasH * 1.09)
    : Math.round(canvasW * 0.935);
  const maxInfoBoxWidth = maxOverlayAllowed - miniMapWidth - gap;
  const maxTextContentWidth = maxInfoBoxWidth - padding * 2;

  // Measure text height and Width - with auto scaling (both UP and DOWN)
  let totalTextHeight = 0;
  let maxLineWidthFound = 0;
  let currentScaleFactor = 2.5; // Start high to allow text to grow significantly
  const minScaleFactor = 0.5; // Don't shrink below 50%
  let wrappedTextData: { lines: string[]; fontSize: number; bold: boolean; hasFlag?: boolean }[] = [];

  // Loop: start big, shrink by small steps until text fits the box
  while (true) {
    wrappedTextData = [];
    totalTextHeight = 0;
    maxLineWidthFound = 0;
    let forceShrink = false;

    for (const line of lines) {
      const scaledFontSize = Math.round(line.fontSize * currentScaleFactor);
      ctx.font = `${line.bold ? '700' : '400'} ${scaledFontSize}px "Roboto", sans-serif`;

      // Reserve space for flag if needed
      const flagSpace = line.hasFlag ? Math.round(scaledFontSize * 1.2) + Math.round(8 * scale) : 0;

      const wrapped = wrapText(ctx, line.text, maxTextContentWidth - flagSpace);
      wrappedTextData.push({ lines: wrapped, fontSize: scaledFontSize, bold: line.bold, hasFlag: line.hasFlag });

      // Calculate height for this line
      totalTextHeight += wrapped.length * scaledFontSize * lineHeight;

      for (const wLine of wrapped) {
        const w = ctx.measureText(wLine).width + (line.hasFlag ? flagSpace : 0);
        if (w > maxLineWidthFound) maxLineWidthFound = w;
      }

      // Constraints to prevent excessive wrapping:
      // Allow up to 3 lines per block if scaling is still high
      if (wrapped.length > 3) forceShrink = true;

      // Special handling for title: try to keep on 1 or 2 lines
      if (line.hasFlag && wrapped.length > 2) forceShrink = true;
    }

    // Include the titleBodyGap in total height calculation
    totalTextHeight += titleBodyGap;

    // Check if it fits within the box height
    if ((totalTextHeight <= maxTextHeight && !forceShrink) || currentScaleFactor <= minScaleFactor) {
      break;
    }

    // Reduce scale by a very small step for extreme precision
    currentScaleFactor -= 0.01;
  }

  // Calculate dynamic widths based on content
  // const contentWidth = maxTextContentWidth; // Force use full width
  const infoBoxWidth = maxInfoBoxWidth;
  const overlayWidth = maxOverlayAllowed;

  // Position: bottom-center of image
  const overlayLeft = Math.round((canvasW - overlayWidth) / 2);
  const overlayBottom = canvasH - margin;

  // Badge sits ABOVE the info box, top-right
  const badgeGap = 0;
  const badgeX = overlayLeft + miniMapWidth + gap + infoBoxWidth - wmBadgeW;
  const badgeY = overlayBottom - infoBoxHeight - badgeGap - wmBadgeH;

  const opacity = proSettings.overlayOpacity / 100;

  // Draw badge (separate small dark box above info box)
  ctx.save();
  ctx.fillStyle = `rgba(50, 50, 50, ${opacity})`;
  const badgeR = Math.round(10 * scale);
  roundRect(ctx, badgeX, badgeY, wmBadgeW, wmBadgeH, { tl: badgeR, tr: badgeR, br: 0, bl: 0 });
  ctx.fill();
  ctx.font = `600 ${fontSizeWatermark}px "Roboto", sans-serif`;
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
  const infoBoxX = overlayLeft + miniMapWidth + gap;
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
  const mmY = overlayBottom - miniMapHeight;

  try {
    const mapImg = await loadStaticMap(location.lat, location.lng, miniMapWidth, miniMapHeight, scale, proSettings.mapType);
    ctx.save();[246]
    // White background behind map
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, mmX, mmY, miniMapWidth, miniMapHeight, mapBorderRadius);
    ctx.fill();
    roundRect(ctx, mmX, mmY, miniMapWidth, miniMapHeight, mapBorderRadius);
    ctx.clip();
    // Draw image slightly zoomed in to "crop" the Google logo at the bottom
    // We scale by 1.3x and shift it up slightly
    const zoomFactor = 1.5;
    const sizeW = miniMapWidth * zoomFactor;
    const sizeH = miniMapHeight * zoomFactor;
    const offsetW = (sizeW - miniMapWidth) / 2;
    const offsetH = (sizeH - miniMapHeight) / 2;
    ctx.drawImage(mapImg, mmX - offsetW, mmY - offsetH, sizeW, sizeH);

    // Custom Google Logo
    ctx.save();
    const logoFontSize = Math.round(30 * scale);
    ctx.font = `500 ${logoFontSize}px "Roboto", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    const logoX = mmX + 8 * scale;
    const logoY = mmY + miniMapHeight - 6 * scale;

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
    roundRect(ctx, mmX, mmY, miniMapWidth, miniMapHeight, mapBorderRadius);
    ctx.fill();
    ctx.fillStyle = '#999';
    ctx.font = `${Math.round(12 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Map', mmX + miniMapWidth / 2, mmY + miniMapHeight / 2 + 4 * scale);
    ctx.restore();
  }

  // Draw text inside info box - vertically centered
  const textX = infoBoxX + padding;
  const verticalSpace = infoBoxHeight - totalTextHeight;
  const textBlockTop = infoBoxY + verticalSpace / 2;
  let textY = textBlockTop + wrappedTextData[0]?.fontSize * 0.9;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';

  // Load flag image if needed
  let flagImg: HTMLImageElement | null = null;
  if (lines[0].hasFlag && location.countryCode) {
    try {
      flagImg = await loadFlagImage(location.countryCode);
    } catch (e) {
      console.warn('Failed to load flag', e);
    }
  }

  for (let i = 0; i < wrappedTextData.length; i++) {
    const block = wrappedTextData[i];
    ctx.font = `${block.bold ? '700' : '400'} ${block.fontSize}px "Roboto", sans-serif`;

    for (let j = 0; j < block.lines.length; j++) {
      const wLine = block.lines[j];
      ctx.fillText(wLine, textX, textY);

      // Draw flag on the LAST line of the block if it has a flag
      if (block.hasFlag && j === block.lines.length - 1 && flagImg) {
        const textWidth = ctx.measureText(wLine).width;
        const flagH = Math.round(block.fontSize * 1.3);
        const flagW = Math.round(flagH * 1.2);

        const flagYPos = textY - Math.round(block.fontSize * 0.35) - Math.round(flagH / 2);
        const flagX = textX + textWidth + Math.round(10 * scale);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 2;
        ctx.drawImage(flagImg, flagX, flagYPos, flagW, flagH);
        ctx.restore();
      }

      textY += block.fontSize * lineHeight;

      // Add extra gap after the first block (Title)
      if (i === 0 && j === block.lines.length - 1) {
        textY += titleBodyGap;
      }
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
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=${pixelW}x${pixelH}&scale=2&maptype=${mapType}&markers=${lat},${lng}&key=${apiKey}`;

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


function loadFlagImage(countryCode: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!countryCode) return reject(new Error('No country code'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log(`Flag loaded successfully: ${img.src}`);
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Local flag not found for ${countryCode}. Tried loading: ${img.src}`);
      reject(new Error(`Flag not found for ${countryCode}`));
    };

    // Convert country code to unicode codepoint hex string (e.g. ID -> u1f1ee_1f1e9)
    const cc = countryCode.toUpperCase();
    const codes = [...cc].map((c) => (0x1f1e6 + c.charCodeAt(0) - 65).toString(16));
    const filename = 'u' + codes.join('_');

    const src = `/flags/${filename}.png`;
    console.log(`Attempting to load flag for ${countryCode}: ${src}`);
    img.src = src;
  });
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode) return '';
  const cc = countryCode.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
