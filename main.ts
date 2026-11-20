// news-image-20261120 — "Sum up 20 November's world news in one image".
//
// A hand-drawn news mosaic: a masthead naming FRIDAY 20 NOVEMBER 2026, one
// full-width lead panel (Trump delays the Iran war decision to 2027), four
// picture-led panels (Cyclone Akvan, Anthropic's record IPO, Voyager 1 one
// light-day away, GTA VI's $1.84bn day), and a bottom strip (Europe's call
// for a winter energy ceasefire in Ukraine, plus World Children's Day and
// the India v New Zealand Test). Every story was reported on 20 November
// 2026; every number and quote on the image is as reported that day.
//
// The image is drawn pixel by pixel into an RGB buffer with a small 5x7
// bitmap font defined below, then encoded as a PNG with Node's standard
// library only (zlib + fs + path). No network, no timestamps, no randomness:
// two runs write byte-identical files.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// PNG encoding (color type 2, RGB, 8-bit, filter 0 on every scanline)
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePng(rgb: Uint8Array, width: number, height: number): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font, drawn by hand. Each glyph is 7 rows of 5 bits.
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '*': ['00000', '10101', '01110', '10101', '00000', '00000', '00000'],
  '\u2022': ['00000', '00000', '01100', '01100', '01100', '00000', '00000'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
};

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with tiny drawing primitives
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

const PAPER: RGB = [246, 241, 231];
const INK: RGB = [20, 33, 61];
const RED: RGB = [193, 18, 31];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [233, 228, 214];
const DARKGREY: RGB = [90, 96, 110];
const TEAL: RGB = [14, 124, 123];
const PURPLE: RGB = [91, 42, 134];
const NAVY2: RGB = [39, 65, 86];
const ORANGE: RGB = [227, 100, 20];
const GOLD: RGB = [232, 180, 32];
const SKY: RGB = [16, 42, 67];
const GREEN: RGB = [0, 122, 61];

class Canvas {
  buf = new Uint8Array(W * H * 3);

  constructor() {
    this.fill(PAPER);
  }

  fill(c: RGB): void {
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = c[0];
      this.buf[i * 3 + 1] = c[1];
      this.buf[i * 3 + 2] = c[2];
    }
  }

  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) this.px(i, j, c);
    }
  }

  // Hollow rectangle, border thickness t.
  frame(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }

  hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
    for (let x = x0; x <= x1; x++) {
      for (let k = 0; k < t; k++) this.px(x, y + k, c);
    }
  }

  vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
    for (let y = y0; y <= y1; y++) {
      for (let k = 0; k < t; k++) this.px(x + k, y, c);
    }
  }

  // Bresenham line, thickness t.
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let a = 0; a < t; a++) {
        for (let b = 0; b < t; b++) this.px(x + a, y + b, c);
      }
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  // Filled disc.
  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) this.px(x, y, c);
      }
    }
  }

  // Circle outline (1px), drawn from parametric points.
  ring(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 2) {
      const t = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
    }
  }

  // Arc outline from a0 to a1 degrees.
  arc(cx: number, cy: number, r: number, a0: number, a1: number, c: RGB, t = 2): void {
    for (let a = a0; a <= a1; a += 2) {
      const rad = (a * Math.PI) / 180;
      const x = Math.round(cx + r * Math.cos(rad));
      const y = Math.round(cy + r * Math.sin(rad));
      for (let i = 0; i < t; i++) {
        for (let j = 0; j < t; j++) this.px(x + i, y + j, c);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Text: bitmap font, scale s (glyph 5x7 -> 5s x 7s, advance 6s).
  // -------------------------------------------------------------------------

  textWidth(text: string, s: number): number {
    return text.length * 6 * s - s;
  }

  text(x: number, y: number, str: string, s: number, c: RGB): void {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch] ?? FONT[' '];
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if (g[r][col] === '1') {
            for (let dy = 0; dy < s; dy++) {
              for (let dx = 0; dx < s; dx++) {
                this.px(cx + col * s + dx, y + r * s + dy, c);
              }
            }
          }
        }
      }
      cx += 6 * s;
    }
  }

  textCenter(x0: number, x1: number, y: number, str: string, s: number, c: RGB): void {
    const w = this.textWidth(str, s);
    this.text(x0 + Math.floor((x1 - x0 - w) / 2), y, str, s, c);
  }

  textRight(x1: number, y: number, str: string, s: number, c: RGB): void {
    this.text(x1 - this.textWidth(str, s), y, str, s, c);
  }
}

// ---------------------------------------------------------------------------
// Drawn icons — every picture in the mosaic is drawn by this code.
// ---------------------------------------------------------------------------

const FLAG_RED: RGB = [179, 25, 66];
const FLAG_BLUE: RGB = [10, 49, 97];
const IRAN_GREEN: RGB = [0, 122, 61];
const IRAN_RED: RGB = [218, 0, 0];

function drawUsFlag(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const stripe = h / 13;
  for (let i = 0; i < 13; i++) {
    cv.rect(x, Math.round(y + i * stripe), w, Math.ceil(stripe), i % 2 === 0 ? FLAG_RED : WHITE);
  }
  const cw = Math.round(w * 0.4);
  const ch = Math.round(h * 0.54);
  cv.rect(x, y, cw, ch, FLAG_BLUE);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      cv.disc(x + 5 + c * 8, y + 5 + r * 8, 2, WHITE);
    }
  }
  cv.frame(x, y, w, h, INK, 2);
}

function drawIranFlag(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const band = Math.floor(h / 3);
  cv.rect(x, y, w, band, IRAN_GREEN);
  cv.rect(x, y + band, w, h - 2 * band, WHITE);
  cv.rect(x, y + 2 * band, w, h - 2 * band, IRAN_RED);
  // Stylised red emblem in the white band: a small crescent-and-sword mark.
  cv.disc(x + Math.floor(w / 2), y + band + Math.floor((h - 2 * band) / 2), 6, IRAN_RED);
  cv.disc(x + Math.floor(w / 2) + 3, y + band + Math.floor((h - 2 * band) / 2) - 2, 5, WHITE);
  cv.frame(x, y, w, h, INK, 2);
}

// Calendar card: red header with a date, big "ON HOLD" body.
function drawCalendarCard(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, WHITE);
  cv.frame(x, y, w, h, INK, 3);
  cv.rect(x + 3, y + 3, w - 6, 26, RED);
  cv.textCenter(x, x + w, y + 8, 'JANUARY 1, 2027', 2, WHITE);
  cv.textCenter(x, x + w, y + 44, 'ON HOLD', 3, INK);
  cv.textCenter(x, x + w, y + 74, 'NO STRIKE BEFORE THEN', 2, DARKGREY);
}

// Cyclone: spiral arcs over a coastline wedge, with rain slashes.
function drawCyclone(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2) - 8;
  cv.disc(cx, cy, 58, [214, 231, 235]);
  for (let r = 12; r <= 52; r += 10) {
    cv.arc(cx, cy, r, r * 4, r * 4 + 250, TEAL, 3);
  }
  cv.disc(cx, cy, 7, TEAL);
  // Coastline wedge at the bottom.
  cv.line(x + 6, y + h - 14, x + Math.floor(w * 0.42), y + h - 34, GREEN, 3);
  cv.line(x + Math.floor(w * 0.42), y + h - 34, x + w - 8, y + h - 18, GREEN, 3);
  cv.disc(x + Math.floor(w * 0.42), y + h - 34, 4, RED);
  // Rain slashes.
  for (let i = 0; i < 4; i++) {
    const rx = x + 14 + i * 26;
    cv.line(rx, y + h - 52 + i * 4, rx - 6, y + h - 40 + i * 4, [70, 110, 140], 2);
  }
}

// Rising bar chart with an arrow: the IPO debut.
function drawChart(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const base = y + h - 18;
  const bars = [26, 44, 62, 88];
  const bw = 20;
  const gap = 10;
  const x0 = x + 8;
  for (let i = 0; i < bars.length; i++) {
    const bh = bars[i];
    cv.rect(x0 + i * (bw + gap), base - bh, bw, bh, i === bars.length - 1 ? RED : PURPLE);
  }
  cv.line(x, base, x + w, base, INK, 3);
  // Arrow over the bars.
  cv.line(x0 + 6, base - 34, x0 + 3 * (bw + gap) + 14, base - 96, RED, 3);
  cv.line(x0 + 3 * (bw + gap) + 14, base - 96, x0 + 3 * (bw + gap) - 2, base - 92, RED, 3);
  cv.line(x0 + 3 * (bw + gap) + 14, base - 96, x0 + 3 * (bw + gap) + 10, base - 82, RED, 3);
  cv.text(x + 4, y + 2, 'ANT', 2, INK);
  cv.textRight(x + w - 2, y + 2, '+17%', 2, RED);
}

// Voyager: a gold dish in a star field, signal rings, "16 BN MILES" arc.
function drawVoyager(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.disc(x + Math.floor(w / 2), y + Math.floor(h / 2), 58, SKY);
  const stars: [number, number][] = [
    [10, 14], [26, 40], [44, 8], [70, 26], [96, 12], [108, 44], [18, 78], [40, 96],
    [84, 88], [104, 74], [60, 60], [92, 58],
  ];
  for (const [sx, sy] of stars) cv.disc(x + sx, y + sy, 2, WHITE);
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  // Signal rings from the probe.
  cv.ring(cx, cy, 24, GOLD);
  cv.ring(cx, cy, 36, GOLD);
  cv.ring(cx, cy, 48, GOLD);
  // Probe: a dish dome on a bus body with two solar panels.
  cv.arc(cx, cy - 8, 13, 180, 360, GOLD, 4);
  cv.line(cx, cy - 8, cx, cy + 4, GOLD, 3);
  cv.disc(cx, cy + 2, 3, GOLD);
  cv.rect(cx - 13, cy + 4, 26, 14, GOLD);
  cv.frame(cx - 13, cy + 4, 26, 14, INK, 1);
  cv.rect(cx - 36, cy + 7, 20, 8, NAVY2);
  cv.rect(cx + 16, cy + 7, 20, 8, NAVY2);
  cv.frame(cx - 36, cy + 7, 20, 8, GOLD, 1);
  cv.frame(cx + 16, cy + 7, 20, 8, GOLD, 1);
}

// City skyline with a game controller in front.
function drawGame(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const base = y + h - 8;
  const towers = [52, 78, 60, 92, 44];
  const tw = 20;
  const gap = 3;
  for (let i = 0; i < towers.length; i++) {
    const th = towers[i];
    const tx = x + 2 + i * (tw + gap);
    cv.rect(tx, base - th, tw, th, INK);
    cv.disc(tx + 5, base - th + 10, 2, GOLD);
    cv.disc(tx + 14, base - th + 20, 2, GOLD);
    cv.disc(tx + 5, base - th + 32, 2, GOLD);
  }
  // Neon "VI" sign on the tallest tower.
  cv.rect(x + 2 + 3 * (tw + gap) - 2, base - 92 - 22, 24, 18, ORANGE);
  cv.text(x + 2 + 3 * (tw + gap), base - 92 - 20, 'VI', 2, WHITE);
  // Controller: rounded body, d-pad left, two buttons right.
  const cy = base - 6;
  cv.rect(x + 8, cy - 26, 104, 28, WHITE);
  cv.frame(x + 8, cy - 26, 104, 28, INK, 2);
  cv.disc(x + 8, cy - 12, 12, WHITE);
  cv.disc(x + 112, cy - 12, 12, WHITE);
  cv.rect(x + 26, cy - 22, 6, 18, INK); // d-pad vertical
  cv.rect(x + 20, cy - 16, 18, 6, INK); // d-pad horizontal
  cv.disc(x + 88, cy - 18, 4, RED);
  cv.disc(x + 100, cy - 10, 4, ORANGE);
}

// One grid panel: coloured kicker band, headline lines, sub lines, icon slot.
function drawPanel(
  cv: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: RGB,
  kicker: string,
  headline: string[],
  sub: string[],
  drawIcon: (cv: Canvas, ix: number, iy: number, iw: number, ih: number) => void,
): void {
  cv.rect(x, y, w, h, WHITE);
  cv.frame(x, y, w, h, INK, 2);
  cv.rect(x + 2, y + 2, w - 4, 30, accent);
  cv.text(x + 14, y + 10, kicker, 2, WHITE);
  let ty = y + 46;
  for (const line of headline) {
    cv.text(x + 14, ty, line, 3, INK);
    ty += 32;
  }
  ty += 6;
  for (const line of sub) {
    cv.text(x + 14, ty, line, 2, DARKGREY);
    ty += 18;
  }
  drawIcon(cv, x + w - 132, y + 40, 118, h - 52);
}

// ---------------------------------------------------------------------------
// Composition: masthead, lead panel, 2x2 grid, bottom strip.
// ---------------------------------------------------------------------------

function compose(): Canvas {
  const cv = new Canvas();

  // Outer frame.
  cv.frame(0, 0, W, H, INK, 8);

  // ---- Masthead: the date is the biggest text on the page. ----
  cv.rect(8, 8, 1008, 128, INK);
  cv.text(24, 22, 'FRIDAY', 2, WHITE);
  cv.textRight(1000, 22, 'WORLD NEWS', 2, WHITE);
  cv.textCenter(8, 1016, 44, '20 NOVEMBER 2026', 7, WHITE);
  cv.textCenter(8, 1016, 104, 'SIX STORIES THAT DEFINED THE DAY', 2, GOLD);

  // ---- Lead panel: Trump delays the Iran war decision to 2027. ----
  const leadY = 144;
  const leadH = 252;
  cv.rect(8, leadY, 1008, leadH, WHITE);
  cv.frame(8, leadY, 1008, leadH, INK, 2);
  cv.rect(10, leadY + 2, 1004, 26, RED);
  cv.text(24, leadY + 9, 'LEAD STORY', 2, WHITE);
  cv.textRight(1000, leadY + 9, 'WASHINGTON - TEHRAN', 2, WHITE);
  cv.text(24, leadY + 44, 'TRUMP DELAYS IRAN WAR', 4, INK);
  cv.text(24, leadY + 76, 'DECISION TO 2027', 4, INK);
  cv.text(24, leadY + 122, "'WE'LL SEE WHAT HAPPENS AFTER JANUARY 1'", 2, INK);
  cv.text(24, leadY + 142, 'NO DECISION BEFORE THE NEW YEAR', 2, INK);
  cv.text(24, leadY + 162, 'TRUMP TO FOX NEWS, ON CHINA TRIP', 2, DARKGREY);
  cv.hline(24, 640, leadY + 188, RED, 3);
  cv.text(24, leadY + 200, 'ISRAEL PRESSES WASHINGTON TO ACT', 2, RED);
  drawUsFlag(cv, 676, leadY + 40, 150, 84);
  drawIranFlag(cv, 842, leadY + 40, 150, 84);
  drawCalendarCard(cv, 700, leadY + 140, 260, 100);

  // ---- 2x2 grid of picture-led panels. ----
  drawPanel(cv, 8, 404, 498, 206, TEAL, 'INDIA - CYCLONE',
    ['CYCLONE AKVAN', 'SLAMS INTO INDIA'],
    ['300,000 EVACUATED IN ODISHA', 'AS STORM MAKES LANDFALL', 'WINDS GUST TO 110 KM/H'],
    drawCyclone);
  drawPanel(cv, 518, 404, 498, 206, PURPLE, 'MARKETS - AI',
    ["ANTHROPIC'S RECORD", '$81BN IPO'],
    ['SHARES CLOSE UP 17%', 'AT $97.17 A SHARE', 'BIGGEST DEBUT EVER'],
    drawChart);
  drawPanel(cv, 8, 618, 498, 206, NAVY2, 'SPACE - NASA',
    ['VOYAGER 1 REACHES', 'ONE LIGHT-DAY'],
    ['16 BILLION MILES FROM EARTH', 'FARTHEST HUMAN-MADE OBJECT', 'SIGNALS TAKE 24 HOURS'],
    drawVoyager);
  drawPanel(cv, 518, 618, 498, 206, ORANGE, 'CULTURE - GAMES',
    ['GTA VI MAKES', '$1.84BN IN A DAY'],
    ['OUTGROSSES THE ODYSSEY', '19 MILLION COPIES SOLD', 'BIGGEST LAUNCH EVER'],
    drawGame);

  // ---- Bottom strip: Ukraine ceasefire call + also today. ----
  const botY = 832;
  const botH = 184;
  cv.rect(8, botY, 632, botH, WHITE);
  cv.frame(8, botY, 632, botH, INK, 2);
  cv.text(24, botY + 16, 'EUROPE - UKRAINE', 2, RED);
  cv.text(24, botY + 40, 'EUROPE URGES WINTER ENERGY', 3, INK);
  cv.text(24, botY + 72, 'CEASEFIRE IN UKRAINE', 3, INK);
  cv.text(24, botY + 108, 'UK, FRANCE AND GERMANY CALL ON RUSSIA', 2, DARKGREY);
  cv.text(24, botY + 126, 'TO STOP STRIKES ON POWER PLANTS', 2, DARKGREY);
  cv.text(24, botY + 156, 'SOURCES: REUTERS - BBC - NASA - THE HINDU', 2, DARKGREY);

  cv.rect(648, botY, 368, botH, GREY);
  cv.frame(648, botY, 368, botH, INK, 2);
  cv.text(664, botY + 14, 'ALSO TODAY', 2, INK);
  cv.rect(664, botY + 40, 8, 8, RED);
  cv.text(680, botY + 38, "WORLD CHILDREN'S DAY", 2, INK);
  cv.text(680, botY + 56, 'UNICEF MARKS 20 NOV', 2, DARKGREY);
  cv.hline(664, 1000, botY + 78, DARKGREY, 1);
  cv.rect(664, botY + 88, 8, 8, RED);
  cv.text(680, botY + 86, 'CRICKET: NICHOLLS 113*', 2, INK);
  cv.text(680, botY + 104, 'NZ 243/5 v INDIA', 2, DARKGREY);
  cv.text(680, botY + 122, '1ST TEST, WELLINGTON', 2, DARKGREY);
  cv.hline(664, 1000, botY + 144, DARKGREY, 1);
  cv.rect(664, botY + 154, 8, 8, RED);
  cv.text(680, botY + 152, 'APEC LEADERS MEET', 2, INK);
  cv.text(680, botY + 170, 'IN SHENZHEN, CHINA', 2, DARKGREY);

  return cv;
}

// ---------------------------------------------------------------------------
// Entry point: write /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png).
// ---------------------------------------------------------------------------

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePng(compose().buf, W, H);
writeFileSync(join(outDir, 'entry.png'), png);
