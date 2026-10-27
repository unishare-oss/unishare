import { arc } from './arc'
import { che } from './che'
import { cpe } from './cpe'
import { cs } from './cs'
import { cve } from './cve'
import { dd } from './dd'
import { dsi } from './dsi'
import { dt } from './dt'
import { eie } from './eie'
import { env } from './env'
import { inc } from './inc'
import { it } from './it'

export const kmutt = {
  university: {
    name: "King Mongkut's University of Technology Thonburi",
    shortName: 'KMUTT',
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/7/76/Seal_of_King_Mongkut's_University_of_Technology_Thonburi.svg",
    // uniauth organization ids differ per environment
    uniauthOrgId: process.env.UNIAUTH_ORG_KMUTT,
  },
  faculties: [
    { name: 'School of Information Technology', departments: [cs, it, dsi] },
    { name: 'Faculty of Engineering', departments: [cpe, inc, eie, env, cve, che] },
    { name: 'School of Architecture and Design', departments: [arc, dd, dt] },
  ],
}
