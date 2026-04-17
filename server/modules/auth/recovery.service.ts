import { randomInt } from 'node:crypto'

const RECOVERY_WORDS = [
  'amber', 'anchor', 'apple', 'april', 'atom', 'autumn', 'beacon', 'birch', 'brave', 'breeze',
  'cabin', 'cactus', 'canal', 'candle', 'cedar', 'circle', 'cloud', 'cobalt', 'coral', 'crystal',
  'daisy', 'delta', 'ember', 'falcon', 'forest', 'frost', 'garden', 'globe', 'harbor', 'hazel',
  'honey', 'island', 'jasmine', 'juniper', 'lagoon', 'lantern', 'laurel', 'lemon', 'linen', 'lotus',
  'marble', 'meadow', 'mercury', 'mint', 'moon', 'mosaic', 'nectar', 'north', 'oasis', 'olive',
  'onyx', 'opal', 'orbit', 'panda', 'pearl', 'pepper', 'pine', 'planet', 'plaza', 'prairie',
  'quartz', 'quiet', 'raven', 'river', 'saffron', 'sage', 'scarlet', 'shadow', 'silver', 'solstice',
  'spring', 'stone', 'sunset', 'thunder', 'timber', 'topaz', 'valley', 'velvet', 'violet', 'willow',
  'winter', 'zephyr', 'acorn', 'aurora', 'basil', 'brook', 'canvas', 'citrus', 'clover', 'comet'
] as const

export function generateRecoveryPhrase(wordCount = 12) {
  const words: string[] = []
  for (let index = 0; index < wordCount; index += 1) {
    words.push(RECOVERY_WORDS[randomInt(RECOVERY_WORDS.length)])
  }
  return words.join(' ')
}
