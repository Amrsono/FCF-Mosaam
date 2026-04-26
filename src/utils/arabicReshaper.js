/**
 * A more robust Arabic reshaper utility to handle Arabic character joining (shaping)
 * and ligatures like Lam-Alef.
 */

const ArabicChars = {
  '\u0621': ['\u0621', '\uFE80', null, null], // Hamza
  '\u0622': ['\u0622', '\uFE82', null, null], // Alef with Madda
  '\u0623': ['\u0623', '\uFE84', null, null], // Alef with Hamza Above
  '\u0624': ['\u0624', '\uFE86', null, null], // Waw with Hamza Above
  '\u0625': ['\u0625', '\uFE88', null, null], // Alef with Hamza Below
  '\u0626': ['\u0626', '\uFE8A', '\uFE8B', '\uFE8C'], // Yeh with Hamza Above
  '\u0627': ['\u0627', '\uFE8E', null, null], // Alef
  '\u0628': ['\u0628', '\uFE90', '\uFE91', '\uFE92'], // Beh
  '\u0629': ['\u0629', '\uFE94', null, null], // Teh Marbuta
  '\u062A': ['\u062A', '\uFE96', '\uFE97', '\uFE98'], // Teh
  '\u062B': ['\u062B', '\uFE9A', '\uFE9B', '\uFE9C'], // Theh
  '\u062C': ['\u062C', '\uFE9E', '\uFE9F', '\uFEA0'], // Jeem
  '\u062D': ['\u062D', '\uFEA2', '\uFEA3', '\uFEA4'], // Hah
  '\u062E': ['\u062E', '\uFEA6', '\uFEA7', '\uFEA8'], // Khah
  '\u062F': ['\u062F', '\uFEAA', null, null], // Dal
  '\u0630': ['\u0630', '\uFEAC', null, null], // Thal
  '\u0631': ['\u0631', '\uFEAE', null, null], // Reh
  '\u0632': ['\u0632', '\uFEB0', null, null], // Zain
  '\u0633': ['\u0633', '\uFEB2', '\uFEB3', '\uFEB4'], // Seen
  '\u0634': ['\u0634', '\uFEB6', '\uFEB7', '\uFEB8'], // Sheen
  '\u0635': ['\u0635', '\uFEBA', '\uFEBB', '\uFEBC'], // Sad
  '\u0636': ['\u0636', '\uFEBE', '\uFEBF', '\uFEC0'], // Dad
  '\u0637': ['\u0637', '\uFEC2', '\uFEC3', '\uFEC4'], // Tah
  '\u0638': ['\u0638', '\uFEC6', '\uFEC7', '\uFEC8'], // Zah
  '\u0639': ['\u0639', '\uFECA', '\uFECB', '\uFECC'], // Ain
  '\u063A': ['\u063A', '\uFECE', '\uFECF', '\uFED0'], // Ghain
  '\u0641': ['\u0641', '\uFED2', '\uFED3', '\uFED4'], // Feh
  '\u0642': ['\u0642', '\uFED6', '\uFED7', '\uFED8'], // Qaf
  '\u0643': ['\u0643', '\uFEDA', '\uFEDB', '\uFEDC'], // Kaf
  '\u0644': ['\u0644', '\uFEDE', '\uFEDF', '\uFEE0'], // Lam
  '\u0645': ['\u0645', '\uFEE2', '\uFEE3', '\uFEE4'], // Meem
  '\u0646': ['\u0646', '\uFEE6', '\uFEE7', '\uFEE8'], // Noon
  '\u0647': ['\u0647', '\uFEEA', '\uFEEB', '\uFEEC'], // Heh
  '\u0648': ['\u0648', '\uFEEE', null, null], // Waw
  '\u0649': ['\u0649', '\uFEF0', null, null], // Alef Maksura
  '\u064A': ['\u064A', '\uFEF2', '\uFEF3', '\uFEF4'], // Yeh
};

// Ligatures (Lam + Alef variants)
const Ligatures = {
  '\u0644\u0627': ['\uFEFB', '\uFEFC'], // Lam + Alef
  '\u0644\u0622': ['\uFEF5', '\uFEF6'], // Lam + Alef Madda
  '\u0644\u0623': ['\uFEF7', '\uFEF8'], // Lam + Alef Hamza Above
  '\u0644\u0625': ['\uFEF9', '\uFEFA'], // Lam + Alef Hamza Below
};

const getCharType = (char) => {
  if (!char) return 0;
  const forms = ArabicChars[char];
  if (!forms) return 0;
  if (forms[2] === null) return 1; // Right-joining
  return 2; // Dual-joining
};

export const reshapeArabic = (text) => {
  if (!text) return text;

  // 1. First pass: Handle Ligatures (Lam-Alef)
  let chars = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    const lig = Ligatures[char + next];
    if (lig) {
      chars.push({ char: char + next, isLigature: true });
      i++; // Skip next
    } else {
      chars.push({ char: char, isLigature: false });
    }
  }

  // 2. Second pass: Shaping
  let result = '';
  for (let i = 0; i < chars.length; i++) {
    const item = chars[i];
    const char = item.char;
    
    if (item.isLigature) {
      const prev = chars[i - 1];
      const prevType = prev ? getCharType(prev.char[prev.char.length - 1]) : 0;
      // Ligatures only have Isolated (0) and Final (1) forms
      result += (prevType === 2) ? Ligatures[char][1] : Ligatures[char][0];
      continue;
    }

    const forms = ArabicChars[char];
    if (!forms) {
      result += char;
      continue;
    }

    const prev = chars[i - 1];
    const next = chars[i + 1];

    const prevType = prev ? (prev.isLigature ? 1 : getCharType(prev.char)) : 0;
    const nextType = next ? (next.isLigature ? 2 : getCharType(next.char)) : 0;

    let formIndex = 0; // Isolated
    if (prevType === 2 && nextType !== 0) {
      formIndex = 3; // Medial
    } else if (prevType === 2) {
      formIndex = 1; // Final
    } else if (nextType !== 0) {
      formIndex = 2; // Beginning
    }

    // Adjust if form is not supported
    if (forms[formIndex] === null) {
      if (formIndex === 3) formIndex = 1;
      else if (formIndex === 2) formIndex = 0;
    }
    
    result += forms[formIndex] || char;
  }
  
  return result;
};
