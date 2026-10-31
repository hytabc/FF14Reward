import { CHAPTERS } from './chapters'
import { GUARDIANS, JOBS, NPCS, ORIGINS } from './characters'
import { ENDINGS, ENDING_MAP } from './endings'
import type {
  Choice,
  Ending,
  EndingCondition,
  FinalChoiceId,
  HistoryEntry,
  MetaProgress,
  PlayerState,
  RunSummary,
  StatKey,
  Stats,
} from './types'

export const STORAGE_KEY = 'echoes-of-the-star:meta:v1'

const BASE_STATS: Stats = {
  resolve: 30,
  aether: 30,
  bond: 30,
  renown: 30,
  shadow: 30,
}

export const EMPTY_META: MetaProgress = {
  unlockedEndings: [],
  cycles: 0,
  dust: 0,
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

export function loadMeta(): MetaProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_META
    const parsed = JSON.parse(raw) as Partial<MetaProgress>
    return {
      unlockedEndings: Array.isArray(parsed.unlockedEndings) ? parsed.unlockedEndings.filter((id): id is string => typeof id === 'string') : [],
      cycles: typeof parsed.cycles === 'number' ? parsed.cycles : 0,
      dust: typeof parsed.dust === 'number' ? parsed.dust : 0,
      lastOrigin: parsed.lastOrigin,
      lastJob: parsed.lastJob,
      lastGuardian: parsed.lastGuardian,
    }
  } catch {
    return EMPTY_META
  }
}

export function saveMeta(meta: MetaProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
  } catch {
    // A fan game should remain playable even when storage is unavailable.
  }
}

export function createInitialState(
  name: string,
  originId: string,
  jobId: string,
  guardianId: string,
  meta: MetaProgress,
): PlayerState {
  const origin = ORIGINS.find((item) => item.id === originId) ?? ORIGINS[0]
  const job = JOBS.find((item) => item.id === jobId) ?? JOBS[0]
  const guardian = GUARDIANS.find((item) => item.id === guardianId) ?? GUARDIANS[0]
  const memoryBonus = Math.min(10, Math.floor(meta.unlockedEndings.length / 4))
  const stats: Stats = { ...BASE_STATS }

  for (const mods of [origin.mods, job.mods, guardian.mods]) {
    for (const [key, value] of Object.entries(mods) as [StatKey, number][]) {
      stats[key] = clamp(stats[key] + value)
    }
  }
  for (const key of Object.keys(stats) as StatKey[]) {
    stats[key] = clamp(stats[key] + memoryBonus)
  }

  const relations: Record<string, number> = {}
  for (const npc of NPCS) relations[npc.id] = 20 + Math.min(8, memoryBonus)

  return {
    name: name.trim() || '无名的冒险者',
    originId: origin.id,
    jobId: job.id,
    guardianId: guardian.id,
    stats,
    gil: job.startingGil + meta.dust * 2,
    flags: [],
    relations,
    chapterIndex: 0,
    jobLevel: 1,
    jobXp: 0,
    history: [],
    choices: [],
    memoryBonus,
  }
}

export interface ChoiceAvailability {
  available: boolean
  reason: string
}

export function getChoiceAvailability(choice: Choice, state: PlayerState): ChoiceAvailability {
  const requirement = choice.requires
  if (!requirement) return { available: true, reason: '' }

  if (requirement.stat && state.stats[requirement.stat.key] < requirement.stat.min) {
    return {
      available: false,
      reason: `需要${requirement.stat.key === 'resolve' ? '意志' : requirement.stat.key === 'aether' ? '以太' : requirement.stat.key === 'bond' ? '羁绊' : requirement.stat.key === 'renown' ? '名望' : '暗影'} ${requirement.stat.min}`,
    }
  }
  if (requirement.flag && !state.flags.includes(requirement.flag)) {
    const names: Record<string, string> = {
      echo_awakened: '超越之力的回响',
      hydaelyn_truth: '海德林的真相',
      azem_memory: '阿泽姆的记忆',
      golden_legacy: '黄金遗产',
      hope_ambassador: '希望的使者',
    }
    return { available: false, reason: `需要「${names[requirement.flag] ?? requirement.flag}」` }
  }
  if (requirement.notFlag && state.flags.includes(requirement.notFlag)) {
    return { available: false, reason: '这条道路已经关闭' }
  }
  if (requirement.gil && state.gil < requirement.gil) {
    return { available: false, reason: `需要 ${requirement.gil.toLocaleString('zh-CN')} 金币` }
  }
  return { available: true, reason: '' }
}

export interface ChoiceResolution {
  state: PlayerState
  immediateEndingId?: string
}

export function applyChoice(state: PlayerState, choice: Choice): ChoiceResolution {
  const nextStats: Stats = { ...state.stats }
  for (const [key, value] of Object.entries(choice.effects) as [StatKey, number][]) {
    nextStats[key] = clamp(nextStats[key] + value)
  }

  const nextRelations = { ...state.relations }
  for (const relation of choice.relations ?? []) {
    nextRelations[relation.npc] = clamp((nextRelations[relation.npc] ?? 20) + relation.value)
  }

  const nextFlags = new Set(state.flags)
  for (const flag of choice.flags ?? []) nextFlags.add(flag)
  for (const flag of choice.removeFlags ?? []) nextFlags.delete(flag)

  const nextXp = state.jobXp + (choice.xp ?? 100)
  const historyEntry: HistoryEntry = {
    chapterTitle: CHAPTERS[state.chapterIndex]?.title ?? '星海尽头',
    choiceTitle: choice.title,
    resultTitle: choice.resultTitle,
    consequence: choice.consequence,
    timestamp: Date.now(),
  }

  const nextState: PlayerState = {
    ...state,
    stats: nextStats,
    gil: Math.max(0, state.gil + (choice.gil ?? 0)),
    flags: [...nextFlags],
    relations: nextRelations,
    jobXp: nextXp,
    jobLevel: 1 + Math.floor(nextXp / 650),
    chapterIndex: state.chapterIndex + 1,
    history: [...state.history, historyEntry],
    choices: [...state.choices, choice.id],
  }

  if (choice.danger && state.stats[choice.danger.stat] < choice.danger.below) {
    return { state: nextState, immediateEndingId: choice.danger.endingId }
  }

  return { state: nextState }
}

export function conditionMatches(condition: EndingCondition, state: PlayerState): boolean {
  if (condition.flags?.some((flag) => !state.flags.includes(flag))) return false
  if (condition.anyFlags?.length && !condition.anyFlags.some((flag) => state.flags.includes(flag))) return false
  if (condition.job?.length && !condition.job.includes(state.jobId)) return false
  if (condition.gilMin !== undefined && state.gil < condition.gilMin) return false
  if (condition.gilMax !== undefined && state.gil > condition.gilMax) return false
  if (condition.min) {
    for (const [key, value] of Object.entries(condition.min) as [StatKey, number][]) {
      if (state.stats[key] < value) return false
    }
  }
  if (condition.max) {
    for (const [key, value] of Object.entries(condition.max) as [StatKey, number][]) {
      if (state.stats[key] > value) return false
    }
  }
  return true
}

export function resolveFinalEnding(state: PlayerState, choice: FinalChoiceId): Ending {
  const candidates = ENDINGS.filter((ending) => ending.choice === choice)
  return candidates.find((ending) => conditionMatches(ending.condition, state)) ?? ENDING_MAP.reset_again
}

export function finishRun(
  meta: MetaProgress,
  state: PlayerState,
  endingId: string,
  finalChoice: FinalChoiceId,
): { meta: MetaProgress; summary: RunSummary } {
  const ending = ENDING_MAP[endingId] ?? ENDINGS[0]
  const isNew = !meta.unlockedEndings.includes(ending.id)
  const dustEarned = (ending.rank === '真结局' ? 15 : ending.rank === '最终结局' ? 7 : 3) + (isNew ? 5 : 0)
  const nextMeta: MetaProgress = {
    ...meta,
    unlockedEndings: isNew ? [...meta.unlockedEndings, ending.id] : meta.unlockedEndings,
    cycles: meta.cycles + 1,
    dust: meta.dust + dustEarned,
    lastOrigin: state.originId,
    lastJob: state.jobId,
    lastGuardian: state.guardianId,
  }
  saveMeta(nextMeta)

  return {
    meta: nextMeta,
    summary: {
      endingId: ending.id,
      player: state,
      finalChoice,
      unlockedAt: Date.now(),
      isNew,
      dustEarned,
    },
  }
}

export function getDominantStats(state: PlayerState, count = 2): StatKey[] {
  return (Object.entries(state.stats) as [StatKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key)
}

export function getTopRelations(state: PlayerState, count = 3): { id: string; value: number }[] {
  return Object.entries(state.relations)
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
}

export function getEndingProgress(meta: MetaProgress): { unlocked: number; total: number; percent: number } {
  const total = ENDINGS.length
  const unlocked = meta.unlockedEndings.filter((id) => Boolean(ENDING_MAP[id])).length
  return { unlocked, total, percent: total === 0 ? 0 : Math.round((unlocked / total) * 100) }
}

export function getUnlockedEndingsByChoice(meta: MetaProgress, choice: FinalChoiceId): number {
  return ENDINGS.filter((ending) => ending.choice === choice && meta.unlockedEndings.includes(ending.id)).length
}
