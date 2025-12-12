const fs = require('fs');
const path = require('path');

// SVG ikona domu/mieszkania dla aplikacji Flatify
const generateSvgIcon = (size, isAdaptive = false) => {
  const padding = isAdaptive ? size * 0.15 : 0; // Adaptive icons need safe zone
  const actualSize = size - (padding * 2);
  const offset = padding;
  
  // Kolory
  const primaryColor = '#4A90D9'; // Niebieski
  const secondaryColor = '#2E5A8B'; // Ciemniejszy niebieski
  const accentColor = '#FFFFFF'; // Biały
  
  // Skalowanie
  const scale = actualSize / 100;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${!isAdaptive ? `<rect width="${size}" height="${size}" fill="${primaryColor}" rx="${size * 0.2}"/>` : ''}
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <!-- Dom - główny kształt -->
    <path d="M50 12 L88 42 L88 88 L12 88 L12 42 Z" fill="${accentColor}" opacity="0.95"/>
    
    <!-- Dach -->
    <path d="M50 8 L95 45 L88 45 L50 15 L12 45 L5 45 Z" fill="${secondaryColor}"/>
    
    <!-- Drzwi -->
    <rect x="40" y="52" width="20" height="36" rx="2" fill="${secondaryColor}"/>
    <circle cx="55" cy="72" r="2" fill="${primaryColor}"/>
    
    <!-- Okno lewe -->
    <rect x="18" y="50" width="16" height="16" rx="2" fill="${primaryColor}"/>
    <line x1="26" y1="50" x2="26" y2="66" stroke="${accentColor}" stroke-width="1.5"/>
    <line x1="18" y1="58" x2="34" y2="58" stroke="${accentColor}" stroke-width="1.5"/>
    
    <!-- Okno prawe -->
    <rect x="66" y="50" width="16" height="16" rx="2" fill="${primaryColor}"/>
    <line x1="74" y1="50" x2="74" y2="66" stroke="${accentColor}" stroke-width="1.5"/>
    <line x1="66" y1="58" x2="82" y2="58" stroke="${accentColor}" stroke-width="1.5"/>
    
    <!-- Komin -->
    <rect x="68" y="18" width="10" height="20" fill="${secondaryColor}"/>
  </g>
</svg>`;
};

// Generowanie PNG z SVG za pomocą sharp (jeśli dostępne)
async function generatePngFromSvg(svgContent, outputPath, size) {
  try {
    const sharp = require('sharp');
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated: ${outputPath}`);
    return true;
  } catch (err) {
    console.log(`⚠ Sharp not available, saving SVG: ${outputPath.replace('.png', '.svg')}`);
    fs.writeFileSync(outputPath.replace('.png', '.svg'), svgContent);
    return false;
  }
}

async function main() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  
  // Generowanie ikon
  const icons = [
    { name: 'icon.png', size: 1024, adaptive: false },
    { name: 'adaptive-icon.png', size: 1024, adaptive: true },
    { name: 'favicon.png', size: 48, adaptive: false },
  ];
  
  for (const icon of icons) {
    const svg = generateSvgIcon(icon.size, icon.adaptive);
    const outputPath = path.join(assetsDir, icon.name);
    await generatePngFromSvg(svg, outputPath, icon.size);
  }
  
  // Splash screen - większy z logiem na środku
  const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1284" height="2778" viewBox="0 0 1284 2778" xmlns="http://www.w3.org/2000/svg">
  <rect width="1284" height="2778" fill="#4A90D9"/>
  <g transform="translate(392, 1089)">
    <!-- Ikona domu na środku -->
    <rect width="500" height="500" fill="#4A90D9" rx="100"/>
    ${generateSvgIcon(500, false).replace(/<\?xml[^?]*\?>/g, '').replace(/<svg[^>]*>/g, '').replace(/<\/svg>/g, '')}
  </g>
  <text x="642" y="1750" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">Flatify</text>
</svg>`;
  
  const splashPath = path.join(assetsDir, 'splash.png');
  await generatePngFromSvg(splashSvg, splashPath, 2778);
  
  console.log('\n✅ Icon generation complete!');
}

main().catch(console.error);
