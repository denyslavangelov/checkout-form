/**
 * Dynamic font loading utility for Google Fonts
 * Allows loading any Google Font on demand
 */

interface FontLoadOptions {
  family: string;
  weights?: string[];
  subsets?: string[];
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
}

/**
 * Loads a Google Font dynamically
 * @param options Font loading options
 * @returns Promise that resolves when font is loaded
 */
export async function loadGoogleFont(options: FontLoadOptions): Promise<void> {
  const { family, weights = ['400'], subsets = ['latin'], display = 'swap' } = options;
  
  // Check if font is already loaded
  if (isFontLoaded(family)) {
    return Promise.resolve();
  }

  // Create Google Fonts URL
  const weightsParam = weights.join(';');
  const subsetsParam = subsets.join(',');
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightsParam}&subset=${subsetsParam}&display=${display}`;

  try {
    // Load the font CSS
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to load font: ${response.statusText}`);
    }
    
    const css = await response.text();
    
    // Create and inject the CSS
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    
    // Wait for font to be loaded
    await waitForFontLoad(family);
    
    console.log(`✅ Font loaded: ${family}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load font ${family}:`, error);
    // Don't throw - let it fall back to system fonts
  }
}

/**
 * Checks if a font is already loaded
 */
function isFontLoaded(family: string): boolean {
  // Check if there's already a link or style tag for this font
  const existingLinks = document.querySelectorAll(`link[href*="${encodeURIComponent(family)}"]`);
  const existingStyles = document.querySelectorAll(`style[data-font="${family}"]`);
  
  return existingLinks.length > 0 || existingStyles.length > 0;
}

/**
 * Waits for a font to be loaded using FontFace API
 */
function waitForFontLoad(family: string): Promise<void> {
  return new Promise((resolve) => {
    if ('fonts' in document) {
      // Use FontFace API if available
      document.fonts.ready.then(() => {
        // Check if the font is actually loaded
        const fontFace = Array.from(document.fonts).find(font => 
          font.family.toLowerCase() === family.toLowerCase()
        );
        
        if (fontFace) {
          resolve();
        } else {
          // Fallback: resolve after a short delay
          setTimeout(resolve, 100);
        }
      });
    } else {
      // Fallback for browsers without FontFace API
      setTimeout(resolve, 100);
    }
  });
}

/**
 * Extracts font family name from a font string
 * Handles cases like "Inter, sans-serif" -> "Inter"
 */
export function extractFontFamily(fontString: string): string {
  if (!fontString || fontString === 'inherit') {
    return '';
  }
  
  // Remove quotes and extract the first font family
  const cleanFont = fontString.replace(/['"]/g, '');
  const firstFont = cleanFont.split(',')[0].trim();
  
  return firstFont;
}

/**
 * Checks if a font family is a Google Font
 * This is a simple heuristic - Google Fonts are typically single words or hyphenated
 */
export function isGoogleFont(fontFamily: string): boolean {
  if (!fontFamily) return false;
  
  // Common system fonts that shouldn't be loaded from Google
  const systemFonts = [
    'inherit', 'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'arial', 'helvetica', 'times', 'courier', 'verdana', 'georgia',
    'trebuchet', 'comic sans', 'impact', 'lucida', 'tahoma'
  ];
  
  const lowerFont = fontFamily.toLowerCase();
  
  // Check if it's a system font
  if (systemFonts.some(system => lowerFont.includes(system))) {
    return false;
  }
  
  // Google Fonts are typically single words or hyphenated words
  // and don't contain common system font keywords
  return /^[a-zA-Z][a-zA-Z0-9\s\-]*$/.test(fontFamily) && 
         !lowerFont.includes('serif') && 
         !lowerFont.includes('sans');
}
