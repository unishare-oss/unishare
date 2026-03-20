const ADJECTIVES = [
  'Purple',
  'Golden',
  'Silver',
  'Cosmic',
  'Fuzzy',
  'Brave',
  'Clever',
  'Swift',
  'Bright',
  'Gentle',
  'Bold',
  'Calm',
  'Fierce',
  'Lucky',
  'Noble',
  'Witty',
  'Jolly',
  'Vivid',
  'Zesty',
  'Daring',
]

const ANIMALS = [
  'Penguin',
  'Octopus',
  'Capybara',
  'Axolotl',
  'Otter',
  'Fox',
  'Owl',
  'Panda',
  'Koala',
  'Dolphin',
  'Falcon',
  'Lynx',
  'Heron',
  'Bison',
  'Crane',
  'Gecko',
  'Raven',
  'Walrus',
  'Quokka',
  'Toucan',
]

export function generateGuestDisplayName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${adj} ${animal}`
}
