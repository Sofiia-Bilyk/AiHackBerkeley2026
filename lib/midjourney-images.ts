const svg = (title: string, a: string, b: string, c: string) => {
  const encoded = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${a}"/>
          <stop offset="0.52" stop-color="${b}"/>
          <stop offset="1" stop-color="${c}"/>
        </linearGradient>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .16"/></feComponentTransfer></filter>
      </defs>
      <rect width="1200" height="800" fill="url(#g)"/>
      <circle cx="245" cy="210" r="120" fill="#fff8"/>
      <circle cx="920" cy="245" r="95" fill="#ffd57a99"/>
      <path d="M120 620 C290 480 470 720 650 560 S960 500 1110 660" fill="none" stroke="#fff8" stroke-width="36" stroke-linecap="round"/>
      <path d="M0 800 L1200 800 L1200 520 C980 620 760 520 560 650 C350 785 170 620 0 700 Z" fill="#17110a66"/>
      <rect width="1200" height="800" filter="url(#grain)"/>
      <text x="70" y="715" font-family="serif" font-size="58" font-weight="700" fill="#fff">${title}</text>
    </svg>
  `).replace(/'/g, "%27").replace(/"/g, "%22");

  return `data:image/svg+xml,${encoded}`;
};

const promptBase = "Midjourney event memory image, documentary-style cultural gathering, warm natural light, respectful authentic details, no readable text, no logos, cinematic editorial photography";

export const midjourneyPastEventImages: Record<string, { url: string; prompt: string }> = {
  midsummer: { url: "/finish-midsummer-2025.png", prompt: `${promptBase}, Finnish Juhannus picnic in a green park, flower crowns, shared picnic table, folk-song circle --ar 3:2` },
  obon: { url: svg("Obon Evening", "#6f3f63", "#d99a29", "#253b73"), prompt: `${promptBase}, Japanese Obon evening with paper lanterns, community dance circle, remembrance ceremony at dusk --ar 3:2` },
  borscht: { url: svg("Borscht Night", "#7f1d1d", "#b85c38", "#244f41"), prompt: `${promptBase}, Ukrainian borscht and bread community dinner, beet soup bowls, embroidered table linens --ar 3:2` },
  paska: { url: svg("Paska Baking", "#d99a29", "#fff0c2", "#8b5a2b"), prompt: `${promptBase}, Ukrainian paska holiday bread baking workshop, braided loaves, flour-dusted community kitchen --ar 3:2` },
  language: { url: svg("Conversation Hour", "#253b73", "#6f3f63", "#d99a29"), prompt: `${promptBase}, Ukrainian conversation hour, small group around cafe tables with notebooks and tea --ar 3:2` },
  poetry: { url: svg("Poetry Exchange", "#3b2f6f", "#b85c38", "#d99a29"), prompt: `${promptBase}, Ukrainian poetry and language exchange, intimate reading circle, books and candles --ar 3:2` },
  embroidery: { url: svg("Embroidery Circle", "#244f41", "#b85c38", "#fff0c2"), prompt: `${promptBase}, Ukrainian embroidery circle, hands stitching colorful traditional patterns, shared craft table --ar 3:2` },
  afrobeats: { url: svg("Afrobeats Dance", "#b85c38", "#d99a29", "#244f41"), prompt: `${promptBase}, Nigerian Afrobeats dance night, joyful movement, colorful fabrics, community hall lighting --ar 3:2` },
  owambe: { url: svg("Owambe Potluck", "#d99a29", "#b85c38", "#6f3f63"), prompt: `${promptBase}, Nigerian Owambe potluck, festive table with rice and stews, aso ebi-inspired colors --ar 3:2` },
  yoruba: { url: svg("Yoruba Basics", "#253b73", "#244f41", "#d99a29"), prompt: `${promptBase}, Yoruba language basics hour, friendly classroom setting, phrase cards, cultural textiles --ar 3:2` },
};
