import type { IconName } from '../game/types'

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.55,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  switch (name) {
    case 'sword':
      return <svg {...common}><path d="m14.5 5.5 4-4 1 1-4 4.1M14.5 5.5 5 15l-1.5 5.5L9 19l9.5-9.5M5 15l4 4M16 12l-4-4" /><path d="m3 21 3-3" /></svg>
    case 'shield':
      return <svg {...common}><path d="M12 2.8 20 6v5.2c0 4.8-3.1 8.2-8 10.1-4.9-1.9-8-5.3-8-10.1V6l8-3.2Z" /><path d="M12 7v9M8.5 11h7" /></svg>
    case 'crystal':
      return <svg {...common}><path d="m12 2 6 5-2.2 11.5L12 22l-3.8-3.5L6 7l6-5Z" /><path d="m6 7 6 2.2L18 7M12 9.2V22M8.2 18.5 12 9.2l3.8 9.3" /></svg>
    case 'leaf':
      return <svg {...common}><path d="M20.5 3.5C12 3 5.5 6.5 5 14c-.1 2.1.5 3.8 1.5 5.2C10 15 14 12.5 18.5 11.5c-3.8 2.2-7 5.1-9.7 9" /><path d="M3 21c2-5.6 5.2-9.4 9.5-11.5" /></svg>
    case 'coin':
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5.2" /><path d="M12 7.5v9M9.8 9.2c.5-.8 1.3-1.2 2.4-1.2 1.4 0 2.4.8 2.4 1.9 0 2.7-4.8 1.2-4.8 4 0 1.1 1 1.9 2.4 1.9 1.1 0 2-.5 2.4-1.3" /></svg>
    case 'flame':
      return <svg {...common}><path d="M12.5 2.5c.4 4-1.1 5.4-3 7.2-2 1.9-3.7 3.8-3.7 6.5 0 2.9 2.6 5.3 6.2 5.3s7-2.1 7-6.4c0-4.8-3.4-6.5-3.4-10.4-1.8 2.2-2.1 4.2-1.6 6.2-1.7-2-1.8-4.1-1.5-8.4Z" /><path d="M10.5 21c-2.4-3.3.7-5.1 1.2-7.1 2.2 1.8 3.8 4.1 2 7.1" /></svg>
    case 'moon':
      return <svg {...common}><path d="M20.5 15.2A8.7 8.7 0 0 1 8.8 3.5 8.8 8.8 0 1 0 20.5 15.2Z" /><path d="m17.2 3 .5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5Z" /></svg>
    case 'sun':
      return <svg {...common}><circle cx="12" cy="12" r="3.6" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>
    case 'compass':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>
    case 'users':
      return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.3-4 2.4-6.2 5.5-6.2s5.2 2.2 5.5 6.2M15.5 5.2a3 3 0 0 1 0 5.8M16 14c3.1 0 4.8 2 5.1 5" /></svg>
    case 'crown':
      return <svg {...common}><path d="m3 7 4.2 3L12 4l4.8 6L21 7l-1.5 11H4.5L3 7Z" /><path d="M5.5 15h13M8 18v-3M12 18v-3M16 18v-3" /></svg>
    case 'eye':
      return <svg {...common}><path d="M2.5 12s3.4-6.2 9.5-6.2S21.5 12 21.5 12 18.1 18.2 12 18.2 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /><path d="M12 6.5V4M12 20v-2" /></svg>
    case 'anchor':
      return <svg {...common}><circle cx="12" cy="5" r="2.2" /><path d="M12 7.2V21M5 12H2.8c.2 4.7 3.5 8.2 9.2 9 5.7-.8 9-4.3 9.2-9H19M8.5 10h7" /></svg>
    case 'book':
      return <svg {...common}><path d="M4 4.5c3-1.3 5.6-.7 8 1.2 2.4-1.9 5-2.5 8-1.2v15c-3-1.3-5.6-.7-8 1.2-2.4-1.9-5-2.5-8-1.2v-15Z" /><path d="M12 5.7v15M7 8.2c1.4-.1 2.4.2 3.4.7M7 12c1.4-.1 2.4.2 3.4.7M17 8.2c-1.4-.1-2.4.2-3.4.7M17 12c-1.4-.1-2.4.2-3.4.7" /></svg>
    case 'star':
      return <svg {...common}><path d="m12 2.5 2.8 6 6.5.7-4.9 4.4 1.4 6.4-5.8-3.3L6.2 20l1.4-6.4-4.9-4.4 6.5-.7 2.8-6Z" /></svg>
    case 'cards':
      return <svg {...common}><rect x="3.2" y="5.2" width="11" height="15" rx="1.5" transform="rotate(-9 8.7 12.7)" /><rect x="9.5" y="4.2" width="11" height="15" rx="1.5" transform="rotate(8 15 11.7)" /><path d="m7 9.5 1 2 2 .2-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L4.9 11.7l2-.2 1-2Z" /></svg>
    case 'fish':
      return <svg {...common}><path d="M3 12c3.2-4.1 7.2-5.4 11.2-3.1L20 5.5l-1 5.2 1 5.3-5.8-3.3C10.2 15.2 6.2 14.1 3 12Z" /><circle cx="8" cy="11" r=".8" fill="currentColor" stroke="none" /><path d="M12 9.8c1.4 1 1.4 3.4 0 4.4" /></svg>
    case 'home':
      return <svg {...common}><path d="m3 10 9-7 9 7M5.5 8.8V21h13V8.8M9.3 21v-6h5.4v6" /><path d="M9 9.5h6" /></svg>
    case 'gear':
      return <svg {...common}><circle cx="12" cy="12" r="3.1" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>
    case 'boat':
      return <svg {...common}><path d="M3 13h18l-3 6H6l-3-6ZM12 3v10M12 5l6 3-6 1M12 7 7 9.5l5.5.5" /><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1" /></svg>
    case 'mask':
      return <svg {...common}><path d="M4 5.5c4-1.2 6-.2 8 1.7 2-1.9 4-2.9 8-1.7-.8 6.8-.7 11.1-4.2 13.2-1.7 1-2.7.3-3.8-1.4-1.1 1.7-2.1 2.4-3.8 1.4C4.7 16.6 4.8 12.3 4 5.5Z" /><path d="M7.5 10c1 .6 2.2.5 3-.2M13.5 9.8c.8.7 2 .8 3 .2M8 14c1.2.8 2.4.8 3.5.1M12.8 14.1c1.1.7 2.3.7 3.4 0" /></svg>
    case 'hand':
      return <svg {...common}><path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4.2a1.5 1.5 0 0 1 3 0v6.3M14 10.5V5.8a1.5 1.5 0 0 1 3 0V13M17 13V8.3a1.5 1.5 0 0 1 3 0v5.2C20 18.3 17.4 21 13 21c-4.6 0-6.2-1.9-8.7-5.4l-1.2-1.7a1.6 1.6 0 0 1 2.5-2l2.3 2.4" /></svg>
    case 'spark':
      return <svg {...common}><path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16ZM5 2l.5 2L7.5 4.5l-2 .5L5 7l-.5-2-2-.5 2-.5L5 2Z" /></svg>
    case 'tower':
      return <svg {...common}><path d="M8 21V6l4-3.5L16 6v15M5 21h14M10 8h4M10 12h4M10 16h4M8 9l-2-1M16 9l2-1" /><path d="M11 21v-3h2v3" /></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
  }
}
