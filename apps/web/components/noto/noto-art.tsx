import type { CSSProperties } from 'react'

const NAVY = '#14213d'
const ORANGE = '#ff8a1f'
const FOLD = '#ffc27d'
const CREAM = '#fff4e6'
const PINK = '#ff7d9a'
const BLUSH = '#ff5f8f'

const LIMB_STYLE: CSSProperties = { stroke: 'var(--noto-limb, #14213d)' }
const INK_STYLE: CSSProperties = { fill: 'var(--noto-limb, #14213d)' }
const SHADOW_STYLE: CSSProperties = { fill: 'var(--noto-shadow, #14213d)' }
const POP_STYLE: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' }
const INK_POP_STYLE: CSSProperties = { ...INK_STYLE, ...POP_STYLE }

const MOUTH_REST_PATH = 'M92 115.5Q100 120.5 108 115.5Q100 120.5 92 115.5Z'

/* The rig overwrites the transform and finger height each frame; the left hand is mirrored. */
function Hand({ side, transform }: { side: 'L' | 'R'; transform: string }) {
  return (
    <g data-part={`hand${side}`} transform={transform}>
      <rect
        data-part={`finger${side}`}
        x="-2.7"
        y="0"
        width="5.4"
        height="6"
        rx="2.7"
        fill={CREAM}
        stroke={NAVY}
        strokeWidth="2.8"
      />
      <circle cx="6.4" cy="-2.4" r="3.3" fill={CREAM} stroke={NAVY} strokeWidth="2.6" />
      <ellipse rx="7.6" ry="8.2" fill={CREAM} stroke={NAVY} strokeWidth="3.1" />
    </g>
  )
}

function Eye({ side, cx }: { side: 'L' | 'R'; cx: number }) {
  return (
    <g data-part={`eye${side}`}>
      <ellipse cx={cx} cy="98" rx="9" ry="11" fill="#fff" stroke={NAVY} strokeWidth="3" />
      <g data-part={`pupil${side}`} transform="translate(1.2 1.4)">
        <circle cx={cx} cy="98" r="4.7" fill={NAVY} />
        <circle cx={cx - 1.6} cy="96.2" r="1.6" fill="#fff" />
      </g>
    </g>
  )
}

/** Noto's SVG at rest. Every element the rig moves carries a data-part attribute. */
export function NotoArt({ clipId }: { clipId: string }) {
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path data-part="mouthClip" d={MOUTH_REST_PATH} />
        </clipPath>
      </defs>
      <ellipse
        data-part="shadow"
        cx="100"
        cy="178"
        rx="36"
        ry="5.5"
        style={SHADOW_STYLE}
        opacity="0.14"
      />
      <g data-part="whole">
        <g fill="none" strokeWidth="4.6" strokeLinecap="round" style={LIMB_STYLE}>
          <path data-part="legL" d="M85.99 150Q81.98 160.5 81.99 171" />
          <path data-part="legR" d="M114.01 150Q118.02 160.5 118.01 171" />
        </g>
        <g data-part="shoeL" transform="translate(78.99 173)">
          <ellipse rx="9.5" ry="4.8" style={INK_STYLE} />
          <ellipse cx="-3" cy="-1.8" rx="3.2" ry="1.2" fill="#fff" opacity="0.35" />
        </g>
        <g data-part="shoeR" transform="translate(121.01 173)">
          <ellipse rx="9.5" ry="4.8" style={INK_STYLE} />
          <ellipse cx="3" cy="-1.8" rx="3.2" ry="1.2" fill="#fff" opacity="0.35" />
        </g>
        <g data-part="torso">
          <path
            d="M68 58h52l22 22v58a12 12 0 0 1-12 12H68a12 12 0 0 1-12-12V70a12 12 0 0 1 12-12z"
            fill={ORANGE}
            stroke={NAVY}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M64.5 76v24"
            stroke="#fff"
            strokeOpacity="0.4"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M64.5 106v3"
            stroke="#fff"
            strokeOpacity="0.4"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <g stroke={NAVY} strokeOpacity="0.16" strokeWidth="3.5" strokeLinecap="round">
            <path d="M70 133h46" />
            <path d="M70 141h28" />
          </g>
          <path
            data-part="fold"
            d="M120 58v14a8 8 0 0 0 8 8h14"
            fill={FOLD}
            stroke={NAVY}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <g
            data-part="brows"
            fill="none"
            stroke={NAVY}
            strokeWidth="3.4"
            strokeLinecap="round"
            opacity="0"
          >
            <path data-part="browL" d="M76 84Q83 80 91 82" />
            <path data-part="browR" d="M124 84Q117 80 109 82" />
          </g>
          <g data-part="eyes">
            <Eye side="L" cx={84} />
            <Eye side="R" cx={112} />
          </g>
          <g
            data-part="happy"
            fill="none"
            stroke={NAVY}
            strokeWidth="3.6"
            strokeLinecap="round"
            opacity="0"
          >
            <path d="M76 101q8-9 16 0" />
            <path d="M104 101q8-9 16 0" />
          </g>
          <g
            data-part="shut"
            fill="none"
            stroke={NAVY}
            strokeWidth="3.4"
            strokeLinecap="round"
            opacity="0"
          >
            <path d="M76 98q8 5 16 0" />
            <path d="M104 98q8 5 16 0" />
          </g>
          <g data-part="blush" fill={BLUSH} opacity="0.39">
            <ellipse cx="72" cy="115" rx="5.5" ry="4" />
            <ellipse cx="124" cy="115" rx="5.5" ry="4" />
          </g>
          <path data-part="mouthFill" fill={NAVY} fillOpacity="0" d={MOUTH_REST_PATH} />
          <ellipse
            data-part="tongue"
            fill={PINK}
            clipPath={`url(#${clipId})`}
            cx="100"
            cy="119.4"
            rx="4.4"
            ry="0"
            opacity="0"
          />
          <path
            data-part="mouthLine"
            fill="none"
            stroke={NAVY}
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            d={MOUTH_REST_PATH}
          />
          <g fill="none" strokeWidth="4.6" strokeLinecap="round" style={LIMB_STYLE}>
            <path data-part="armL" d="M58 108Q47.82 121.73 49.18 138.76" />
            <path data-part="armR" d="M142 108Q152.18 121.73 150.82 138.76" />
          </g>
          <Hand side="L" transform="translate(49.18 138.76) rotate(16) scale(-1 1)" />
          <Hand side="R" transform="translate(150.82 138.76) rotate(-16)" />
          <path
            data-part="sweat"
            d="M148 74q6 9 0 13q-6-4 0-13z"
            fill="#7fb2ff"
            stroke={NAVY}
            strokeWidth="2"
            opacity="0"
            style={POP_STYLE}
          />
          <g data-part="dots" opacity="0" style={INK_POP_STYLE}>
            <circle cx="150" cy="64" r="3" />
            <circle cx="160" cy="55" r="4" />
            <circle cx="173" cy="44" r="5.5" />
          </g>
          <g
            data-part="zzz"
            fontFamily="var(--font-display, 'Baloo 2'), ui-rounded, sans-serif"
            fontWeight="800"
            opacity="0"
            style={INK_POP_STYLE}
          >
            <text x="140" y="60" fontSize="14">
              z
            </text>
            <text x="152" y="46" fontSize="18">
              z
            </text>
            <text x="166" y="30" fontSize="22">
              z
            </text>
          </g>
          <g fill="#ffc94d" stroke={NAVY} strokeWidth="2" strokeLinejoin="round">
            <path
              data-part="star"
              d="M44 70l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"
              opacity="0"
              style={POP_STYLE}
            />
            <path
              data-part="star"
              d="M156 50l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z"
              opacity="0"
              style={POP_STYLE}
            />
            <path
              data-part="star"
              d="M162 104l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z"
              opacity="0"
              style={POP_STYLE}
            />
          </g>
        </g>
      </g>
    </>
  )
}
