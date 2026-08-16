import html2canvas, { Options } from 'html2canvas';

/**
 * Helper to resolve unsupported color functions like oklch(...) and oklab(...) 
 * to standard rgb(...) colors before html2canvas parses the DOM.
 * Tailwind CSS v4 uses oklch(...) by default, which is not supported by html2canvas parser.
 */
export function getHtml2CanvasOptions(customOptions: Partial<Options> = {}): Partial<Options> {
  return {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc: Document) => {
      const resolveColorToRgb = (colorStr: string): string => {
        try {
          const temp = document.createElement('div');
          temp.style.color = colorStr;
          document.body.appendChild(temp);
          const computed = window.getComputedStyle(temp).color;
          document.body.removeChild(temp);
          if (
            computed &&
            !computed.includes('oklch') &&
            !computed.includes('oklab') &&
            computed !== ''
          ) {
            return computed;
          }
        } catch (e) {
          // ignore
        }
        return 'rgb(79, 70, 229)';
      };

      // 1. Process all <style> elements in clonedDoc
      const styles = clonedDoc.querySelectorAll('style');
      styles.forEach((s) => {
        if (
          s.textContent &&
          (s.textContent.includes('oklch') || s.textContent.includes('oklab'))
        ) {
          s.textContent = s.textContent
            .replace(/oklch\([^)]+\)/g, (match) => resolveColorToRgb(match))
            .replace(/oklab\([^)]+\)/g, (match) => resolveColorToRgb(match));
        }
      });

      // 2. Process all style attributes in clonedDoc
      const elements = clonedDoc.querySelectorAll('*');
      elements.forEach((node) => {
        const el = node as HTMLElement;
        if (el.getAttribute) {
          const styleAttr = el.getAttribute('style');
          if (
            styleAttr &&
            (styleAttr.includes('oklch') || styleAttr.includes('oklab'))
          ) {
            const cleanStyle = styleAttr
              .replace(/oklch\([^)]+\)/g, (match) => resolveColorToRgb(match))
              .replace(/oklab\([^)]+\)/g, (match) => resolveColorToRgb(match));
            el.setAttribute('style', cleanStyle);
          }
        }
      });
    },
    ...customOptions,
  };
}

export async function captureCanvas(element: HTMLElement, customOptions: Partial<Options> = {}) {
  const options = getHtml2CanvasOptions(customOptions);
  return await html2canvas(element, options);
}
