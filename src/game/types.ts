export type StatKey = 'resolve' | 'aether' | 'bond' | 'renown' | 'shadow'

export type Stats = Record<StatKey, number>

export type IconName =
  | 'sword'
  | 'shield'
  | 'crystal'
  | 'leaf'
  | 'coin'
  | 'flame'
  | 'moon'
  | 'sun'
  | 'compass'
  | 'users'
  | 'crown'
  | 'eye'
  | 'anchor'
  | 'book'
  | 'star'
  | 'cards'
  | 'fish'
  | 'home'
  | 'gear'
  | 'boat'
  | 'mask'
  | 'hand'
  | 'spark'
  | 'tower'

export type FinalChoiceId =
  | 'sacrifice'
  | 'defy'
  | 'voyage'
  | 'home'
  | 'throne'
  | 'void'
  | 'reset'

export type Tone = 'light' | 'dark' | 'neutral' | 'gold'

export interface Origin {
  id: string
  city: string
  nation: string
  title: string
  description: string
  icon: IconName
  accent: string
  mods: Partial<Stats>
  blessing: string
}

export interface Job {
  id: string
  name: string
  role: string
  weapon: string
  title: string
  description: string
  icon: IconName
  accent: string
  mods: Partial<Stats>
  passive: string
  startingGil: number
}

export interface Guardian {
  id: string
  name: string
  epithet: string
  description: string
  icon: IconName
  mods: Partial<Stats>
}

export interface Npc {
  id: string
  name: string
  title: string
  description: string
  icon: IconName
  color: string
}

export interface RelationChange {
  npc: string
  value: number
}

export interface ChoiceRequirement {
  stat?: { key: StatKey; min: number }
  flag?: string
  notFlag?: string
  gil?: number
}

export interface DangerCheck {
  stat: StatKey
  below: number
  endingId: string
  warning: string
}

export interface Choice {
  id: string
  title: string
  kicker: string
  description: string
  icon: IconName
  tone: Tone
  effects: Partial<Stats>
  gil?: number
  relations?: RelationChange[]
  flags?: string[]
  removeFlags?: string[]
  xp?: number
  resultTitle: string
  result: string
  consequence: string
  danger?: DangerCheck
  requires?: ChoiceRequirement
}

export interface Ecosystem {
  duty: string
  party: string
  market: string
  chatter: string[]
}

export interface Chapter {
  id: string
  act: string
  actNumber: number
  index: number
  era: string
  title: string
  location: string
  stage: 'forest' | 'coast' | 'desert' | 'snow' | 'void' | 'city' | 'star' | 'gold'
  quoteBy: string
  quote: string
  narrative: string[]
  choices: Choice[]
  ecosystem: Ecosystem
}

export interface EndingCondition {
  min?: Partial<Stats>
  max?: Partial<Stats>
  flags?: string[]
  anyFlags?: string[]
  gilMin?: number
  gilMax?: number
  job?: string[]
}

export interface Ending {
  id: string
  choice: FinalChoiceId | 'early'
  title: string
  subtitle: string
  rank: '歧路结局' | '篇章结局' | '最终结局' | '真结局'
  tone: Tone
  quote: string
  story: string[]
  hint: string
  condition: EndingCondition
}

export interface FinalChoice {
  id: FinalChoiceId
  title: string
  subtitle: string
  description: string
  icon: IconName
  tone: Tone
  warning: string
}

export interface HistoryEntry {
  chapterTitle: string
  choiceTitle: string
  resultTitle: string
  consequence: string
  timestamp: number
}

export interface PlayerState {
  name: string
  originId: string
  jobId: string
  guardianId: string
  stats: Stats
  gil: number
  flags: string[]
  relations: Record<string, number>
  chapterIndex: number
  jobLevel: number
  jobXp: number
  history: HistoryEntry[]
  choices: string[]
  memoryBonus: number
}

export interface MetaProgress {
  unlockedEndings: string[]
  cycles: number
  dust: number
  lastOrigin?: string
  lastJob?: string
  lastGuardian?: string
}

export interface RunSummary {
  endingId: string
  player: PlayerState
  finalChoice: FinalChoiceId
  unlockedAt: number
  isNew: boolean
  dustEarned: number
}

export const STAT_META: Record<StatKey, { label: string; short: string; color: string; description: string }> = {
  resolve: { label: '意志', short: '意志', color: '#e9c879', description: '面对终末仍愿向前一步的力量。' },
  aether: { label: '以太', short: '以太', color: '#78c9e8', description: '听见星海回声、理解世界规则的感知。' },
  bond: { label: '羁绊', short: '羁绊', color: '#e997a8', description: '有人愿意在副本门口等你。' },
  renown: { label: '名望', short: '名望', color: '#c8a5ff', description: '艾欧泽亚记住你名字的程度。' },
  shadow: { label: '暗影', short: '暗影', color: '#8d99c9', description: '你理解终末，也被终末理解的程度。' },
}
