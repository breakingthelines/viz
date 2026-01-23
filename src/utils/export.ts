import { toPng, toSvg, toBlob } from 'html-to-image';

export interface ExportOptions {
  /** Scale factor for the exported image */
  scale?: number;
  /** Background color (transparent if not set) */
  backgroundColor?: string;
  /** Quality for JPEG/WebP (0-1) */
  quality?: number;
  /** File name without extension */
  fileName?: string;
}

/**
 * Export an element as PNG and trigger download
 */
export async function exportAsPng(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { scale = 2, backgroundColor, fileName = 'visualization' } = options;

  const dataUrl = await toPng(element, {
    pixelRatio: scale,
    backgroundColor,
  });

  downloadDataUrl(dataUrl, `${fileName}.png`);
}

/**
 * Export an element as SVG and trigger download
 */
export async function exportAsSvg(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { backgroundColor, fileName = 'visualization' } = options;

  const dataUrl = await toSvg(element, {
    backgroundColor,
  });

  downloadDataUrl(dataUrl, `${fileName}.svg`);
}

/**
 * Export an element as Blob (for clipboard or other uses)
 */
export async function exportAsBlob(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<Blob> {
  const { scale = 2, backgroundColor } = options;

  return toBlob(element, {
    pixelRatio: scale,
    backgroundColor,
  }) as Promise<Blob>;
}

/**
 * Copy visualization to clipboard as PNG
 */
export async function copyToClipboard(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const blob = await exportAsBlob(element, options);

  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': blob,
    }),
  ]);
}

/**
 * Helper to trigger download from data URL
 */
function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
