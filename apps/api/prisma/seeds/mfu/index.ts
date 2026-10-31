import { agroIndustry } from './agro-industry'
import { appliedDigitalTechnology } from './applied-digital-technology'
import { cosmeticScience } from './cosmetic-science'
import { healthScience } from './health-science'
import { integrativeMedicine } from './integrative-medicine'
import { law } from './law'
import { liberalArts } from './liberal-arts'
import { management } from './management'
import { nursing } from './nursing'
import { science } from './science'
import { sinology } from './sinology'
import { socialInnovation } from './social-innovation'

export const mfu = {
  university: {
    name: 'Mae Fah Luang University',
    shortName: 'MFU',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/th/d/da/%E0%B8%AA%E0%B8%B1%E0%B8%8D%E0%B8%A5%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%93%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%88%E0%B8%B3%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2%E0%B9%81%E0%B8%A1%E0%B9%88%E0%B8%9F%E0%B9%89%E0%B8%B2%E0%B8%AB%E0%B8%A5%E0%B8%A7%E0%B8%87.png',
    // the uniauth organization slug, the same in every environment
    slug: 'mfu',
  },
  faculties: [
    science,
    agroIndustry,
    appliedDigitalTechnology,
    cosmeticScience,
    healthScience,
    integrativeMedicine,
    nursing,
    sinology,
    management,
    law,
    liberalArts,
    socialInnovation,
  ],
}
