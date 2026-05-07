// Decode OSHB/Robinson morphology codes into readable labels
// Hebrew codes start with H, Greek codes start with G or are Robinson codes

// Hebrew part of speech (first letter after H)
const HEB_POS: Record<string, string> = {
  A: 'adj',
  C: 'conj',
  D: 'adv',
  N: 'noun',
  P: 'pron',
  R: 'prep',
  S: 'suff',
  T: 'part',
  V: 'verb',
}

// Hebrew verb stems
const HEB_STEM: Record<string, string> = {
  q: 'Qal',
  N: 'Niphal',
  p: 'Piel',
  P: 'Pual',
  h: 'Hiphil',
  H: 'Hophal',
  t: 'Hithpael',
  Q: 'Qal pass',
}

// Hebrew verb forms
const HEB_FORM: Record<string, string> = {
  p: 'perf',
  q: 'pass',
  i: 'impf',
  w: 'consec',
  v: 'imper',
  a: 'inf abs',
  c: 'inf cstr',
  r: 'ptc',
  s: 'ptc pass',
}

// Hebrew person
const HEB_PERSON: Record<string, string> = {
  '1': '1st',
  '2': '2nd',
  '3': '3rd',
}

// Hebrew gender
const HEB_GENDER: Record<string, string> = {
  m: 'masc',
  f: 'fem',
  b: 'both',
  c: 'common',
}

// Hebrew number
const HEB_NUMBER: Record<string, string> = {
  s: 'sing',
  p: 'plur',
  d: 'dual',
}

// Hebrew noun state
const HEB_STATE: Record<string, string> = {
  a: 'abs',
  c: 'cstr',
  d: 'det',
}

export function decodeMorphology(code: string): string {
  if (!code) return ''

  // Split on / to handle prefix/suffix segments — decode the main segment
  const segments = code.split('/')
  const parts: string[] = []

  for (const seg of segments) {
    const decoded = decodeSegment(seg)
    if (decoded) parts.push(decoded)
  }

  return parts.join(', ')
}

function decodeSegment(seg: string): string {
  if (!seg) return ''

  // Hebrew codes start with H
  if (seg.startsWith('H')) {
    return decodeHebrew(seg.slice(1))
  }

  // Greek — just return the part of speech from the code
  if (seg.startsWith('G')) {
    return seg.slice(1)
  }

  // Suffix markers like Sp2ms = suffix pronoun 2nd masc sing
  if (seg.startsWith('S')) {
    return decodeSuffix(seg)
  }

  // Bare Hebrew segment (after / split, e.g. "Vqw3ms" from "HC/Vqw3ms")
  if (HEB_POS[seg[0]]) {
    return decodeHebrew(seg)
  }

  return ''
}

function decodeHebrew(code: string): string {
  if (!code) return ''

  const pos = HEB_POS[code[0]]
  if (!pos) return ''

  const rest = code.slice(1)

  if (pos === 'verb' && rest.length >= 2) {
    const stem = HEB_STEM[rest[0]] || ''
    const form = HEB_FORM[rest[1]] || ''
    const person = HEB_PERSON[rest[2]] || ''
    const gender = HEB_GENDER[rest[3]] || ''
    const number = HEB_NUMBER[rest[4]] || ''
    return [pos, stem, form, person, gender, number].filter(Boolean).join(' ')
  }

  if (pos === 'noun' || pos === 'adj') {
    // Nouns: N + type(c/p/g) + gender + number + state
    // type: c=common, p=proper, g=gentilic
    // Or for adjectives: A + type(a/o) + gender + number + state
    const sub = rest[0]
    let offset = 0
    let subLabel = ''
    if (sub === 'c' || sub === 'p' || sub === 'g' || sub === 'a' || sub === 'o') {
      if (sub === 'p') subLabel = 'proper'
      if (sub === 'g') subLabel = 'gentilic'
      offset = 1
    }
    const gender = HEB_GENDER[rest[offset]] || ''
    const number = HEB_NUMBER[rest[offset + 1]] || ''
    const state = HEB_STATE[rest[offset + 2]] || ''
    return [pos, subLabel, gender, number, state].filter(Boolean).join(' ')
  }

  if (pos === 'pron' || pos === 'suff') {
    const person = HEB_PERSON[rest[1]] || ''
    const gender = HEB_GENDER[rest[2]] || ''
    const number = HEB_NUMBER[rest[3]] || ''
    return [pos, person, gender, number].filter(Boolean).join(' ')
  }

  return pos
}

function decodeSuffix(code: string): string {
  // Sp2ms = suffix pronoun 2nd masc sing
  if (code.length < 3) return 'suff'
  const person = HEB_PERSON[code[2]] || ''
  const gender = HEB_GENDER[code[3]] || ''
  const number = HEB_NUMBER[code[4]] || ''
  return ['suff', person, gender, number].filter(Boolean).join(' ')
}
