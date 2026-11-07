/**
 * Inter advance widths, in thousandths of an em, for the printable ASCII
 * range (space to tilde), measured in Chromium from `@fontsource/inter` 5.2.
 * The wheel lays its curved labels out with these on the server, where there
 * is no canvas to measure text. Summed advances come within 2% of the
 * browser's kerned width for every wheel label.
 */
const ADVANCE: Record<400 | 500 | 600, readonly number[]> = {
  400: [
    281, 288, 466, 633, 642, 982, 644, 300, 365, 365, 501, 662, 288, 460, 288, 360, 631, 407, 610,
    618, 646, 593, 620, 566, 619, 620, 288, 302, 662, 662, 662, 511, 966, 690, 654, 730, 722, 601,
    590, 746, 743, 269, 571, 672, 565, 903, 753, 765, 639, 765, 644, 642, 646, 744, 690, 985, 682,
    679, 629, 365, 360, 365, 471, 456, 323, 562, 612, 571, 612, 583, 370, 613, 591, 242, 242, 549,
    242, 876, 591, 600, 612, 612, 376, 528, 327, 591, 562, 818, 546, 562, 552, 426, 333, 426, 662,
  ],
  500: [
    267, 304, 494, 639, 646, 993, 653, 313, 369, 369, 521, 667, 303, 462, 303, 370, 646, 415, 616,
    627, 656, 603, 630, 571, 629, 630, 303, 315, 667, 667, 667, 527, 982, 709, 657, 733, 722, 603,
    589, 748, 745, 272, 575, 688, 565, 913, 756, 767, 642, 769, 648, 646, 653, 740, 709, 1003, 701,
    696, 641, 369, 370, 369, 477, 463, 337, 568, 618, 577, 618, 587, 379, 620, 602, 252, 252, 559,
    252, 888, 602, 604, 618, 618, 387, 539, 340, 602, 575, 829, 557, 575, 559, 440, 346, 440, 667,
  ],
  600: [
    252, 321, 523, 644, 650, 1004, 663, 326, 373, 373, 540, 673, 319, 465, 319, 379, 660, 423, 623,
    636, 666, 612, 640, 576, 640, 640, 319, 329, 673, 673, 673, 543, 999, 728, 659, 737, 722, 605,
    588, 749, 746, 277, 580, 703, 565, 922, 759, 769, 645, 773, 652, 650, 660, 736, 728, 1020, 720,
    713, 652, 373, 379, 373, 481, 469, 351, 574, 624, 583, 624, 591, 389, 625, 612, 262, 262, 569,
    262, 900, 612, 609, 624, 624, 397, 549, 353, 612, 587, 839, 569, 588, 566, 455, 359, 455, 673,
  ],
};

/** Width for a character outside the table: wider than any Inter lowercase letter. */
const FALLBACK = 700;

/** Kerning and font fallback slack on top of the summed advances. */
export const WIDTH_SLACK = 1.03;

/** Width of `text` in Inter at `size` and `weight`, with `WIDTH_SLACK` applied. */
export function interWidth(text: string, size: number, weight: 400 | 500 | 600): number {
  const table = ADVANCE[weight];
  let sum = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)! - 32;
    sum += c >= 0 && c < table.length ? table[c] : FALLBACK;
  }
  return (sum / 1000) * size * WIDTH_SLACK;
}
