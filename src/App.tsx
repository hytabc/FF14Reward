import { useEffect, useMemo, useState } from 'react'
import { Icon } from './components/Icon'
import { CHAPTERS, FINAL_CHAPTER } from './game/chapters'
import { GUARDIANS, JOBS, NPCS, ORIGINS } from './game/characters'
import {
  EMPTY_META,
  applyChoice,
  clamp,
  createInitialState,
  finishRun,
  getChoiceAvailability,
  getDominantStats,
  getEndingProgress,
  getTopRelations,
  getUnlockedEndingsByChoice,
  loadMeta,
  resolveFinalEnding,
  saveMeta,
} from './game/engine'
import { ENDINGS, FINAL_CHOICES } from './game/endings'
import { STAT_META } from './game/types'
import type {
  Chapter,
  Choice,
  Ending,
  FinalChoiceId,
  IconName,
  MetaProgress,
  PlayerState,
  RunSummary,
  StatKey,
  Stats,
} from './game/types'

type Screen = 'title' | 'create' | 'game' | 'ending'
type GalleryFilter = 'all' | FinalChoiceId | 'early'

interface ResolutionState {
  choice: Choice
  previousStats: Stats
  immediateEndingId?: string
}

const FLAG_LABELS: Record<string, string> = {
  adventurer_guild: '冒险者行会登记',
  market_wizard: '市场板操盘手',
  tataru_business: '塔塔露的商业伙伴',
  hildibrand_chaos: '调查员助手',
  echo_awakened: '超越之力',
  mentor_seed: '豆芽导师',
  tomestone_goblin: '神典石仓鼠',
  glamour_hunter: '幻化猎人',
  solo_delver: '独自深潜者',
  primal_slayer: '蛮神讨伐者',
  primal_pacifist: '先听理由的人',
  primal_echo: '蛮神以太回响',
  solo_primal: '单人开怪记录',
  dragon_peace: '人龙停战缔造者',
  truth_bearer: '真相持有者',
  dragoon_path: '苍天之龙骑士',
  heretical_truth: '禁书库读者',
  hydaelyn_truth: '理解海德林',
  snow_flower: '雪莲花采集者',
  dark_warrior: '暗之战士',
  night_restored: '黑夜夺回者',
  farm_light: '雷克兰德农户',
  island_house: '无人岛屋主',
  feo_ul: '妖精王的朋友',
  card_master: '九宫幻卡大师',
  save_garlemald: '加雷马救援者',
  hope_ambassador: '希望的使者',
  nihilism_debate: '终末辩论者',
  magitek_loot: '魔导仓库清空者',
  small_light: '终末点灯人',
  soul_crystal: '灵魂水晶共鸣',
  azem_memory: '阿泽姆的记忆',
  krile_tea: '可露儿的茶友',
  zero_clear: '零式通关者',
  pandaemonium: '万魔殿挑战者',
  golden_legacy: '黄金遗产继承者',
  tuliyollal_festival: '万民祭典主办人',
  ninth_world: '第九世界旅人',
  void_touched: '虚空回响',
  cozy_life: '慢生活实践者',
}

const GALLERY_GROUPS: { id: GalleryFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'sacrifice', label: '熔尽光' },
  { id: 'defy', label: '拒绝神' },
  { id: 'voyage', label: '远航' },
  { id: 'home', label: '留下' },
  { id: 'throne', label: '王座' },
  { id: 'void', label: '终末' },
  { id: 'reset', label: '重启' },
  { id: 'early', label: '歧路' },
]

const TONE_LABELS: Record<Ending['rank'], string> = {
  歧路结局: 'BRANCH END',
  篇章结局: 'CHAPTER END',
  最终结局: 'FINAL END',
  真结局: 'TRUE END',
}

function getEntityName(id: string): string {
  return NPCS.find((npc) => npc.id === id)?.name ?? id
}

function getEntityIcon(id: string): IconName {
  return NPCS.find((npc) => npc.id === id)?.icon ?? 'star'
}

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN')
}

export default function App() {
  const [meta, setMeta] = useState<MetaProgress>(() => {
    if (typeof localStorage === 'undefined') return EMPTY_META
    return loadMeta()
  })
  const [screen, setScreen] = useState<Screen>('title')
  const [creationStep, setCreationStep] = useState(0)
  const [name, setName] = useState('')
  const [originId, setOriginId] = useState(ORIGINS[0].id)
  const [jobId, setJobId] = useState(JOBS[0].id)
  const [guardianId, setGuardianId] = useState(GUARDIANS[0].id)
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [resolution, setResolution] = useState<ResolutionState | null>(null)
  const [selectedFinalChoice, setSelectedFinalChoice] = useState<FinalChoiceId | null>(null)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all')

  const progress = getEndingProgress(meta)
  const resolutionChapter = resolution && player && player.chapterIndex > 0 ? CHAPTERS[player.chapterIndex - 1] : null
  const nextChapter = player && player.chapterIndex < CHAPTERS.length ? CHAPTERS[player.chapterIndex] : null
  const currentChapter = resolution ? resolutionChapter : nextChapter
  const isFinale = Boolean(player && player.chapterIndex >= CHAPTERS.length && !resolution)
  const currentEnding = summary ? ENDINGS.find((ending) => ending.id === summary.endingId) : undefined
  const selectedEnding = player && selectedFinalChoice ? resolveFinalEnding(player, selectedFinalChoice) : null

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [screen, player?.chapterIndex])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setGalleryOpen(false)
        setJournalOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const startNewLife = () => {
    const nextPlayer = createInitialState(name, originId, jobId, guardianId, meta)
    const nextMeta = { ...meta, lastOrigin: originId, lastJob: jobId, lastGuardian: guardianId }
    saveMeta(nextMeta)
    setMeta(nextMeta)
    setPlayer(nextPlayer)
    setResolution(null)
    setSelectedFinalChoice(null)
    setSummary(null)
    setScreen('game')
  }

  const handleChoice = (choice: Choice) => {
    if (!player || resolution) return
    const availability = getChoiceAvailability(choice, player)
    if (!availability.available) return
    const result = applyChoice(player, choice)
    setPlayer(result.state)
    setResolution({
      choice,
      previousStats: player.stats,
      immediateEndingId: result.immediateEndingId,
    })
  }

  const finishWithEnding = (endingId: string, finalChoice: FinalChoiceId) => {
    if (!player) return
    const result = finishRun(meta, player, endingId, finalChoice)
    setMeta(result.meta)
    setSummary(result.summary)
    setResolution(null)
    setScreen('ending')
  }

  const continueJourney = () => {
    if (!resolution) return
    if (resolution.immediateEndingId) {
      finishWithEnding(resolution.immediateEndingId, 'defy')
      return
    }
    setResolution(null)
  }

  const chooseFinalAnswer = () => {
    if (!player || !selectedFinalChoice) return
    const ending = resolveFinalEnding(player, selectedFinalChoice)
    finishWithEnding(ending.id, selectedFinalChoice)
  }

  const openGallery = (filter: GalleryFilter = 'all') => {
    setGalleryFilter(filter)
    setGalleryOpen(true)
    setJournalOpen(false)
  }

  const openJournal = () => {
    if (!player) return
    setJournalOpen(true)
    setGalleryOpen(false)
  }

  const returnToTitle = () => {
    setScreen('title')
    setSummary(null)
    setSelectedFinalChoice(null)
    setResolution(null)
  }

  const restartLife = () => {
    setScreen('create')
    setCreationStep(0)
    setName('')
    setSummary(null)
    setSelectedFinalChoice(null)
    setResolution(null)
  }

  return (
    <div className="app-shell">
      <div className="ambient-background" aria-hidden="true">
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <div className="star-field" />
        <div className="crystal-silhouette crystal-left" />
        <div className="crystal-silhouette crystal-right" />
      </div>

      {screen === 'game' && (
        <GameHeader
          player={player}
          isFinale={isFinale}
          meta={meta}
          onJournal={openJournal}
          onGallery={() => openGallery('all')}
          onRestart={restartLife}
        />
      )}

      {screen === 'title' && (
        <TitleScreen
          meta={meta}
          progress={progress}
          onStart={() => {
            setCreationStep(0)
            setScreen('create')
          }}
          onGallery={() => openGallery('all')}
          lastOrigin={meta.lastOrigin}
          lastJob={meta.lastJob}
        />
      )}

      {screen === 'create' && (
        <CreationScreen
          step={creationStep}
          name={name}
          originId={originId}
          jobId={jobId}
          guardianId={guardianId}
          meta={meta}
          onName={setName}
          onOrigin={setOriginId}
          onJob={setJobId}
          onGuardian={setGuardianId}
          onBack={() => {
            if (creationStep === 0) setScreen('title')
            else setCreationStep((value) => value - 1)
          }}
          onNext={() => {
            if (creationStep < 2) setCreationStep((value) => value + 1)
            else startNewLife()
          }}
        />
      )}

      {screen === 'game' && player && (
        <main className="game-layout">
          <CharacterPanel player={player} resolution={resolution} />
          <section className="story-column">
            {currentChapter && !isFinale && (
              <ChapterView
                chapter={currentChapter}
                player={player}
                resolution={resolution}
                onChoice={handleChoice}
                onContinue={continueJourney}
              />
            )}
            {isFinale && (
              <FinaleView
                player={player}
                meta={meta}
                selectedChoice={selectedFinalChoice}
                selectedEnding={selectedEnding}
                onSelect={setSelectedFinalChoice}
                onConfirm={chooseFinalAnswer}
                onOpenGallery={openGallery}
              />
            )}
          </section>
          <EcosystemPanel
            chapter={currentChapter}
            isFinale={isFinale}
            player={player}
          />
        </main>
      )}

      {screen === 'ending' && summary && currentEnding && (
        <EndingScreen
          ending={currentEnding}
          summary={summary}
          player={summary.player}
          meta={meta}
          onRestart={restartLife}
          onTitle={returnToTitle}
          onGallery={() => openGallery(currentEnding.choice === 'early' ? 'early' : currentEnding.choice)}
        />
      )}

      {galleryOpen && (
        <EndingGallery
          meta={meta}
          filter={galleryFilter}
          onFilter={setGalleryFilter}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {journalOpen && player && (
        <JournalModal
          player={player}
          onClose={() => setJournalOpen(false)}
        />
      )}

      <div className="grain-overlay" aria-hidden="true" />
      <div className="vignette-overlay" aria-hidden="true" />
    </div>
  )
}

interface GameHeaderProps {
  player: PlayerState | null
  isFinale: boolean
  meta: MetaProgress
  onJournal: () => void
  onGallery: () => void
  onRestart: () => void
}

function GameHeader({ player, isFinale, meta, onJournal, onGallery, onRestart }: GameHeaderProps) {
  const progress = getEndingProgress(meta)
  const chapterNumber = player ? Math.min(player.chapterIndex + 1, CHAPTERS.length) : 1
  return (
    <header className="game-header">
      <div className="brand-lockup">
        <div className="brand-crystal"><Icon name="crystal" size={20} /></div>
        <div>
          <span className="brand-kicker">ECHOES OF THE STAR</span>
          <strong>星海回响</strong>
        </div>
      </div>

      <div className="header-progress" aria-label="人生进度">
        <div className="header-progress-copy">
          <span>{isFinale ? '终章 · 星海尽头' : '第 ' + chapterNumber + ' / ' + CHAPTERS.length + ' 章'}</span>
          <span>结局图鉴 {progress.unlocked} / {progress.total}</span>
        </div>
        <div className="header-progress-track">
          <span style={{ width: (isFinale ? 100 : Math.max(6, (chapterNumber / CHAPTERS.length) * 100)) + '%' }} />
        </div>
      </div>

      <nav className="header-actions" aria-label="游戏菜单">
        <button className="icon-button labeled" onClick={onJournal}>
          <Icon name="book" size={17} />
          <span>旅途手记</span>
        </button>
        <button className="icon-button labeled" onClick={onGallery}>
          <Icon name="star" size={17} />
          <span>结局图鉴</span>
        </button>
        <button className="icon-button" onClick={onRestart} aria-label="重新投胎">
          <Icon name="moon" size={18} />
        </button>
      </nav>
    </header>
  )
}

interface TitleScreenProps {
  meta: MetaProgress
  progress: { unlocked: number; total: number; percent: number }
  onStart: () => void
  onGallery: () => void
  lastOrigin?: string
  lastJob?: string
}

function TitleScreen({ meta, progress, onStart, onGallery, lastOrigin, lastJob }: TitleScreenProps) {
  const lastOriginName = ORIGINS.find((origin) => origin.id === lastOrigin)?.city
  const lastJobName = JOBS.find((job) => job.id === lastJob)?.name
  return (
    <main className="title-screen">
      <div className="title-ornament title-ornament-top">
        <span />
        <Icon name="crystal" size={18} />
        <span />
      </div>

      <section className="title-hero">
        <div className="title-eyebrow">
          <span>A FAN-MADE EORZEAN LIFE SIMULATION</span>
          <span className="eyebrow-line" />
          <span>第七灵灾后 · 再一次新生</span>
        </div>
        <div className="title-wordmark">
          <span className="title-small">艾欧泽亚人生重开录</span>
          <h1>星海<span>回响</span></h1>
          <p>ECHOES OF THE STAR</p>
        </div>
        <p className="title-lead">
          你又一次在新生庆典醒来。记忆是碎的，世界仍在前行，而每一条看似普通的选择，都可能通向完全不同的结局。
        </p>

        <div className="title-actions">
          <button className="primary-button title-start" onClick={onStart}>
            <span>开启新的人生</span>
            <Icon name="spark" size={18} />
          </button>
          <button className="secondary-button" onClick={onGallery}>
            <Icon name="star" size={17} />
            结局图鉴
          </button>
        </div>

        <div className="title-features">
          <div>
            <strong>{ENDINGS.length}</strong>
            <span>个结局</span>
          </div>
          <div>
            <strong>9</strong>
            <span>段旅途</span>
          </div>
          <div>
            <strong>7</strong>
            <span>条最终道路</span>
          </div>
          <div>
            <strong>{meta.cycles}</strong>
            <span>次人生</span>
          </div>
        </div>
      </section>

      <aside className="title-side">
        <div className="memory-card">
          <div className="memory-card-head">
            <span>灵魂记忆</span>
            <span className="memory-dust"><Icon name="spark" size={13} /> {meta.dust}</span>
          </div>
          <div
            className="progress-orbit"
            style={{ background: 'conic-gradient(#e7c77a ' + progress.percent + '%, rgba(255,255,255,.08) 0)' }}
          >
            <div className="progress-orbit-inner">
              <strong>{progress.percent}%</strong>
              <span>图鉴完成</span>
            </div>
          </div>
          <p>每一次抵达结局，都会留下星砂。下一次醒来时，前世的记忆会替你多点亮一点属性。</p>
          <div className="memory-stat-row">
            <span>已解锁</span>
            <strong>{progress.unlocked} / {progress.total}</strong>
          </div>
          {lastOriginName && (
            <div className="last-life">
              <span>上一世</span>
              <strong>{lastOriginName} · {lastJobName ?? '冒险者'}</strong>
            </div>
          )}
        </div>

        <div className="world-ticker-card">
          <div className="panel-mini-title"><span className="live-dot" /> 艾欧泽亚此刻</div>
          <p>海都广场有人弹起《Answers》，路过的冒险者停下听完了整首。</p>
          <p>九宫幻卡大赛决出冠军：一位坚持使用陆行鸟卡组的豆芽。</p>
          <p>图莱尤拉祭典筹备组正在征集“不会跳舞也可以来”的志愿者。</p>
        </div>
      </aside>

      <footer className="title-footer">
        <span>非官方同人作品 · 不含游戏内购</span>
        <span>愿你的旅途，总有星光与归途。</span>
      </footer>
    </main>
  )
}

interface CreationScreenProps {
  step: number
  name: string
  originId: string
  jobId: string
  guardianId: string
  meta: MetaProgress
  onName: (value: string) => void
  onOrigin: (value: string) => void
  onJob: (value: string) => void
  onGuardian: (value: string) => void
  onBack: () => void
  onNext: () => void
}

function CreationScreen(props: CreationScreenProps) {
  const origin = ORIGINS.find((item) => item.id === props.originId) ?? ORIGINS[0]
  const job = JOBS.find((item) => item.id === props.jobId) ?? JOBS[0]
  const guardian = GUARDIANS.find((item) => item.id === props.guardianId) ?? GUARDIANS[0]
  const preview = useMemo(
    () => createInitialState(props.name, props.originId, props.jobId, props.guardianId, props.meta),
    [props.name, props.originId, props.jobId, props.guardianId, props.meta],
  )
  const stepNames = ['降生之地', '冒险职业', '守护神与名字']

  return (
    <main className="creation-screen">
      <header className="creation-header">
        <button className="back-button" onClick={props.onBack}>
          <span>←</span> {props.step === 0 ? '返回标题' : '上一步'}
        </button>
        <div className="creation-progress">
          {[0, 1, 2].map((index) => (
            <div key={index} className={'creation-step ' + (index === props.step ? 'active' : index < props.step ? 'done' : '')}>
              <span>0{index + 1}</span>
              <small>{stepNames[index]}</small>
            </div>
          ))}
        </div>
        <div className="creation-seal"><Icon name="crystal" size={18} /></div>
      </header>

      <section className="creation-content">
        <div className="creation-intro">
          <span className="section-kicker">SOUL REGISTRATION · 灵魂登记</span>
          <h1>{props.step === 0 ? '你从哪一座城醒来？' : props.step === 1 ? '这一次，你握住了什么？' : '谁会在星海尽头等你？'}</h1>
          <p>
            {props.step === 0 && '出生地不会决定你的结局，但会改变世界第一次回应你的方式。'}
            {props.step === 1 && '职业不是枷锁，而是你面对副本、战争与普通生活时最熟悉的一种姿势。'}
            {props.step === 2 && '十二神与阿泽姆都只是路标。真正要走完旅途的人，仍然是你。'}
          </p>
        </div>

        {props.step === 0 && (
          <div className="origin-grid">
            {ORIGINS.map((item, index) => (
              <button
                key={item.id}
                className={'origin-card ' + (item.id === props.originId ? 'selected' : '')}
                style={{ '--accent': item.accent } as React.CSSProperties}
                onClick={() => props.onOrigin(item.id)}
              >
                <span className="card-index">0{index + 1}</span>
                <span className="origin-icon"><Icon name={item.icon} size={28} /></span>
                <span className="origin-nation">{item.nation}</span>
                <strong>{item.city}</strong>
                <em>{item.title}</em>
                <p>{item.description}</p>
                <span className="origin-blessing"><Icon name="spark" size={13} /> {item.blessing}</span>
                <span className="mod-list">
                  {Object.entries(item.mods).map(([key, value]) => (
                    <span key={key} style={{ color: STAT_META[key as StatKey].color }}>{STAT_META[key as StatKey].short} +{value}</span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}

        {props.step === 1 && (
          <div className="job-grid">
            {JOBS.map((item) => (
              <button
                key={item.id}
                className={'job-card ' + (item.id === props.jobId ? 'selected' : '')}
                style={{ '--accent': item.accent } as React.CSSProperties}
                onClick={() => props.onJob(item.id)}
              >
                <span className="job-icon"><Icon name={item.icon} size={23} /></span>
                <span className="job-copy">
                  <small>{item.role} · {item.weapon}</small>
                  <strong>{item.name}</strong>
                  <em>{item.title}</em>
                </span>
                <span className="job-passive">{item.passive}</span>
              </button>
            ))}
          </div>
        )}

        {props.step === 2 && (
          <div className="final-creation-grid">
            <div className="guardian-column">
              <div className="guardian-grid">
                {GUARDIANS.map((item) => (
                  <button
                    key={item.id}
                    className={'guardian-card ' + (item.id === props.guardianId ? 'selected' : '')}
                    onClick={() => props.onGuardian(item.id)}
                  >
                    <Icon name={item.icon} size={21} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.epithet}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="guardian-quote">
                <span>守护神的低语</span>
                <p>“{guardian.description}”</p>
              </div>
            </div>

            <div className="identity-column">
              <div className="name-field">
                <label htmlFor="adventurer-name">冒险者之名</label>
                <input
                  id="adventurer-name"
                  value={props.name}
                  maxLength={16}
                  onChange={(event) => props.onName(event.target.value)}
                  placeholder="输入你的名字"
                  autoFocus
                />
                <span>{props.name.length} / 16</span>
              </div>

              <div className="life-preview">
                <div className="life-preview-head">
                  <div className="preview-avatar"><Icon name={job.icon} size={26} /></div>
                  <div>
                    <small>下一世</small>
                    <strong>{props.name.trim() || '无名的冒险者'}</strong>
                    <span>{origin.city} · {job.name}</span>
                  </div>
                </div>
                <div className="preview-stats">
                  {(Object.keys(preview.stats) as StatKey[]).map((key) => (
                    <div key={key} className="preview-stat">
                      <span>{STAT_META[key].label}</span>
                      <div><i style={{ width: preview.stats[key] + '%', background: STAT_META[key].color }} /></div>
                      <strong>{preview.stats[key]}</strong>
                    </div>
                  ))}
                </div>
                <div className="preview-meta">
                  <span>初始金币 <strong>{formatNumber(preview.gil)}</strong></span>
                  <span>灵魂星砂加成 <strong>+{preview.memoryBonus}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="creation-footer">
          <div className="selection-summary">
            <span>{origin.city}</span>
            <i />
            <span>{job.name}</span>
            <i />
            <span>{guardian.name}</span>
          </div>
          <button className="primary-button" onClick={props.onNext}>
            <span>{props.step === 2 ? '投入这片星海' : '继续'}</span>
            <Icon name={props.step === 2 ? 'crystal' : 'compass'} size={18} />
          </button>
        </div>
      </section>
    </main>
  )
}

interface CharacterPanelProps {
  player: PlayerState
  resolution: ResolutionState | null
}

function CharacterPanel({ player, resolution }: CharacterPanelProps) {
  const origin = ORIGINS.find((item) => item.id === player.originId) ?? ORIGINS[0]
  const job = JOBS.find((item) => item.id === player.jobId) ?? JOBS[0]
  const guardian = GUARDIANS.find((item) => item.id === player.guardianId) ?? GUARDIANS[0]
  const topRelations = getTopRelations(player, 4)
  const jobProgress = player.jobXp % 650

  return (
    <aside className="character-panel glass-panel">
      <div className="character-identity">
        <div className="character-crystal" style={{ '--accent': origin.accent } as React.CSSProperties}>
          <span className="crystal-ring" />
          <Icon name={job.icon} size={30} />
        </div>
        <div>
          <span className="character-world">{origin.nation} · {origin.city}</span>
          <h2>{player.name}</h2>
          <p>{job.name} <i /> {guardian.name}的信徒</p>
        </div>
      </div>

      <div className="level-strip">
        <div>
          <span>职业等级</span>
          <strong>Lv.{player.jobLevel}</strong>
        </div>
        <div className="level-track"><span style={{ width: Math.max(5, (jobProgress / 650) * 100) + '%' }} /></div>
        <span>{jobProgress} / 650</span>
      </div>

      <div className="panel-section">
        <div className="panel-heading">
          <span>人生状态</span>
          <small>SOUL STATE</small>
        </div>
        <div className="stats-list">
          {(Object.keys(player.stats) as StatKey[]).map((key) => {
            const delta = resolution ? player.stats[key] - resolution.previousStats[key] : 0
            return (
              <div className="stat-row" key={key}>
                <div className="stat-label">
                  <span>{STAT_META[key].label}</span>
                  <span className="stat-number">
                    {player.stats[key]}
                    {delta !== 0 && <em className={delta > 0 ? 'positive' : 'negative'}>{delta > 0 ? '+' : ''}{delta}</em>}
                  </span>
                </div>
                <div className="stat-track">
                  <span style={{ width: player.stats[key] + '%', background: STAT_META[key].color }} />
                  <i style={{ left: player.stats[key] + '%' }} />
                </div>
                <p>{STAT_META[key].description}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="resource-grid">
        <div><Icon name="coin" size={16} /><span>金币</span><strong>{formatNumber(player.gil)}</strong></div>
        <div><Icon name="book" size={16} /><span>经历</span><strong>{player.choices.length}</strong></div>
        <div><Icon name="spark" size={16} /><span>星砂</span><strong>{player.memoryBonus}</strong></div>
      </div>

      <div className="panel-section relation-section">
        <div className="panel-heading">
          <span>拂晓的回响</span>
          <small>BONDS</small>
        </div>
        <div className="relation-list">
          {topRelations.map((relation) => {
            const npc = NPCS.find((item) => item.id === relation.id)
            if (!npc) return null
            return (
              <div className="relation-row" key={relation.id}>
                <span className="relation-icon" style={{ color: npc.color }}><Icon name={getEntityIcon(relation.id)} size={15} /></span>
                <div>
                  <span>{npc.name}</span>
                  <div className="relation-track"><i style={{ width: relation.value + '%', background: npc.color }} /></div>
                </div>
                <strong>{relation.value}</strong>
              </div>
            )
          })}
        </div>
      </div>

      <div className="character-footer">
        <Icon name="crystal" size={15} />
        <span>灵魂水晶稳定 · 记忆完整度 {clamp(55 + player.memoryBonus * 3, 0, 99)}%</span>
      </div>
    </aside>
  )
}

interface ChapterViewProps {
  chapter: Chapter
  player: PlayerState
  resolution: ResolutionState | null
  onChoice: (choice: Choice) => void
  onContinue: () => void
}

function ChapterView({ chapter, player, resolution, onChoice, onContinue }: ChapterViewProps) {
  return (
    <article className={'chapter-view ' + (resolution ? 'resolving' : '')}>
      <div className={'chapter-stage stage-' + chapter.stage}>
        <div className="stage-weather" />
        <div className="stage-architecture">
          <span className="stage-spire spire-one" />
          <span className="stage-spire spire-two" />
          <span className="stage-spire spire-three" />
          <span className="stage-crystal" />
        </div>
        <div className="stage-horizon" />
        <div className="stage-caption">
          <span>{chapter.location}</span>
          <small>{chapter.era}</small>
        </div>
      </div>

      <div className="chapter-heading">
        <div className="chapter-act">
          <span>{chapter.act}</span>
          <i />
          <span>CHAPTER {String(chapter.index + 1).padStart(2, '0')}</span>
        </div>
        <h1>{chapter.title}</h1>
        <div className="chapter-location"><Icon name="compass" size={15} /> {chapter.location}</div>
      </div>

      {!resolution && (
        <>
          <div className="narrative-copy">
            {chapter.narrative.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          <blockquote className="chapter-quote">
            <span className="quote-mark">“</span>
            <p>{chapter.quote}</p>
            <cite>—— {chapter.quoteBy}</cite>
          </blockquote>

          <div className="choice-heading">
            <div>
              <span className="section-kicker">MAKE YOUR CHOICE</span>
              <h2>这一次，你要怎么做？</h2>
            </div>
            <span className="choice-count">0{chapter.choices.length} 个选项</span>
          </div>

          <div className="choices-list">
            {chapter.choices.map((choice, index) => {
              const availability = getChoiceAvailability(choice, player)
              const isDanger = Boolean(choice.danger)
              return (
                <button
                  key={choice.id}
                  className={'choice-card tone-' + choice.tone + (isDanger ? ' danger-choice' : '') + (!availability.available ? ' locked' : '')}
                  disabled={!availability.available}
                  onClick={() => onChoice(choice)}
                >
                  <span className="choice-number">0{index + 1}</span>
                  <span className="choice-icon"><Icon name={choice.icon} size={22} /></span>
                  <span className="choice-main">
                    <span className="choice-kicker">
                      {choice.kicker}
                      {isDanger && <em className="danger-tag"><Icon name="eye" size={11} /> 危险</em>}
                    </span>
                    <strong>{choice.title}</strong>
                    <p>{choice.description}</p>
                    {!availability.available && <span className="requirement-note"><Icon name="crystal" size={12} /> {availability.reason}</span>}
                    {choice.danger && availability.available && (
                      <span className="danger-note">{choice.danger.warning} 当前 {player.stats[choice.danger.stat]}。</span>
                    )}
                  </span>
                  <span className="choice-effects">
                    {Object.entries(choice.effects).map(([key, value]) => (
                      <span key={key} style={{ color: STAT_META[key as StatKey].color }}>
                        {STAT_META[key as StatKey].short} {value > 0 ? '+' : ''}{value}
                      </span>
                    ))}
                    {choice.gil !== undefined && <span className="gil-effect"><Icon name="coin" size={11} /> {choice.gil > 0 ? '+' : ''}{formatNumber(choice.gil)}</span>}
                  </span>
                  <span className="choice-arrow">→</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {resolution && (
        <ResolutionCard
          resolution={resolution}
          onContinue={onContinue}
        />
      )}

      <div className="chapter-pagination">
        {CHAPTERS.map((item) => (
          <span
            key={item.id}
            className={item.index < player.chapterIndex ? 'complete' : item.index === player.chapterIndex ? 'current' : ''}
          >
            <i />
            <small>{String(item.index + 1).padStart(2, '0')}</small>
          </span>
        ))}
        <span className={player.chapterIndex >= CHAPTERS.length ? 'current' : ''}><i /><small>终</small></span>
      </div>
    </article>
  )
}

function ResolutionCard({ resolution, onContinue }: { resolution: ResolutionState; onContinue: () => void }) {
  const isEnding = Boolean(resolution.immediateEndingId)
  return (
    <div className={'resolution-card ' + (isEnding ? 'fatal' : '')}>
      <div className="resolution-glyph"><Icon name={isEnding ? 'eye' : resolution.choice.icon} size={32} /></div>
      <span className="section-kicker">{isEnding ? 'BRANCH TERMINATED · 旅途中断' : 'CHOICE RECORDED · 选择已记录'}</span>
      <h2>{resolution.choice.resultTitle}</h2>
      <p className="resolution-primary">{resolution.choice.result}</p>
      <div className="resolution-divider"><span /><Icon name="crystal" size={14} /><span /></div>
      <p className="resolution-consequence">{resolution.choice.consequence}</p>
      {isEnding && <p className="fatal-warning">你的意志没能撑过这次选择。星海将记录这条歧路。</p>}
      <div className="resolution-effects">
        {Object.entries(resolution.choice.effects).map(([key, value]) => (
          <span key={key} style={{ color: STAT_META[key as StatKey].color }}>
            {STAT_META[key as StatKey].label} {value > 0 ? '+' : ''}{value}
          </span>
        ))}
        {(resolution.choice.relations ?? []).map((relation) => (
          <span key={relation.npc} className="relation-effect">{getEntityName(relation.npc)} {relation.value > 0 ? '+' : ''}{relation.value}</span>
        ))}
      </div>
      <button className="primary-button" onClick={onContinue}>
        <span>{isEnding ? '接受这个结局' : '继续旅途'}</span>
        <Icon name={isEnding ? 'star' : 'compass'} size={18} />
      </button>
    </div>
  )
}

function EcosystemPanel({ chapter, isFinale, player }: { chapter: Chapter | null; isFinale: boolean; player: PlayerState }) {
  const ecosystem = chapter?.ecosystem ?? {
    duty: '最终决战 · 星海尽头（无攻略）',
    party: '全服招募：一起走到最后 23=1',
    market: '星砂价格已失效 · 今天不营业',
    chatter: [
      '所有频道突然安静了一秒，然后同时亮起。',
      '有人在世界频道发：需要帮忙就喊，我们不退队。',
      '拂晓血盟全员在线，状态栏统一写着“等你回来”。',
    ],
  }

  return (
    <aside className="ecosystem-panel glass-panel">
      <div className="ecosystem-head">
        <div>
          <span className="live-dot" />
          <strong>艾欧泽亚生态</strong>
        </div>
        <span className="server-name">MANA · 星海</span>
      </div>

      <div className="eco-block duty-block">
        <div className="eco-label">
          <Icon name="users" size={15} />
          <span>任务搜索器</span>
          <small>DUTY FINDER</small>
        </div>
        <p>{ecosystem.duty}</p>
        <div className="queue-state"><span /> 排队中 · 预计 12 分钟</div>
      </div>

      <div className="eco-block">
        <div className="eco-label">
          <Icon name="crown" size={15} />
          <span>招募板</span>
          <small>PARTY FINDER</small>
        </div>
        <p className="party-text">{ecosystem.party}</p>
        <div className="party-tags"><span>休闲</span><span>语音可</span><span>不压力</span></div>
      </div>

      <div className="eco-block market-block">
        <div className="eco-label">
          <Icon name="coin" size={15} />
          <span>市场行情</span>
          <small>MARKET BOARD</small>
        </div>
        <p>{ecosystem.market}</p>
        <div className="market-chart" aria-hidden="true">
          {[22, 32, 27, 46, 40, 57, 51, 66, 60, 78, 63, 84, 76, 92].map((height, index) => (
            <span key={index} style={{ height: height + '%' }} />
          ))}
        </div>
      </div>

      <div className="eco-block chat-block">
        <div className="eco-label">
          <Icon name="spark" size={15} />
          <span>旅途频道</span>
          <small>WORLD CHAT</small>
        </div>
        <div className="chatter-list">
          {ecosystem.chatter.map((line, index) => (
            <div key={line} className="chatter-line">
              <span className="chat-avatar">{(['旅', '市', '友'] as string[])[index % 3]}</span>
              <p>{line}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="eco-block mini-character">
        <div className="mini-character-row">
          <div className="mini-avatar"><Icon name="crystal" size={17} /></div>
          <div>
            <span>{player.name}</span>
            <small>{isFinale ? '正在星海尽头做出选择' : '当前状态：聆听世界的回响'}</small>
          </div>
          <span className="online-badge">在线</span>
        </div>
      </div>

      <div className="ecosystem-footer">
        <Icon name="gear" size={13} />
        <span>服务器时间 23:59 · 距离重置 1 分钟</span>
      </div>
    </aside>
  )
}

interface FinaleViewProps {
  player: PlayerState
  meta: MetaProgress
  selectedChoice: FinalChoiceId | null
  selectedEnding: Ending | null
  onSelect: (choice: FinalChoiceId) => void
  onConfirm: () => void
  onOpenGallery: (filter?: GalleryFilter) => void
}

function FinaleView({ player, meta, selectedChoice, selectedEnding, onSelect, onConfirm, onOpenGallery }: FinaleViewProps) {
  const dominant = getDominantStats(player, 2)
  return (
    <article className="finale-view">
      <div className="finale-stage">
        <div className="final-star"><span /><Icon name="crystal" size={54} /><span /></div>
        <div className="final-orbit orbit-one" />
        <div className="final-orbit orbit-two" />
        <div className="final-constellation">
          {[8, 16, 25, 37, 49, 62, 73, 84, 91].map((left, index) => (
            <i key={left} style={{ left: left + '%', top: 15 + (index % 4) * 17 + '%' }} />
          ))}
        </div>
      </div>

      <div className="chapter-heading finale-heading">
        <div className="chapter-act">
          <span>终章 · 星海</span>
          <i />
          <span>FINAL ACT</span>
        </div>
        <h1>{FINAL_CHAPTER.title}</h1>
        <div className="chapter-location"><Icon name="star" size={15} /> {FINAL_CHAPTER.era}</div>
      </div>

      <div className="narrative-copy finale-copy">
        {FINAL_CHAPTER.narrative.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>

      <blockquote className="chapter-quote final-quote">
        <span className="quote-mark">“</span>
        <p>{FINAL_CHAPTER.quote}</p>
        <cite>—— {FINAL_CHAPTER.quoteBy}</cite>
      </blockquote>

      <div className="final-dominant">
        <span>这一生最响亮的两种回响</span>
        <div>
          {dominant.map((key) => (
            <strong key={key} style={{ color: STAT_META[key].color }}><Icon name="crystal" size={14} /> {STAT_META[key].label} {player.stats[key]}</strong>
          ))}
        </div>
      </div>

      <div className="choice-heading final-choice-heading">
        <div>
          <span className="section-kicker">THE LAST ANSWER</span>
          <h2>你如何回答这个世界？</h2>
        </div>
        <span className="choice-count">每条路都通向不同回声</span>
      </div>

      <div className="final-choice-list">
        {FINAL_CHOICES.map((choice, index) => {
          const unlocked = getUnlockedEndingsByChoice(meta, choice.id)
          const total = ENDINGS.filter((ending) => ending.choice === choice.id).length
          const isSelected = selectedChoice === choice.id
          return (
            <button
              key={choice.id}
              className={'final-choice-card tone-' + choice.tone + (isSelected ? ' selected' : '')}
              onClick={() => onSelect(choice.id)}
            >
              <span className="final-choice-index">0{index + 1}</span>
              <span className="final-choice-icon"><Icon name={choice.icon} size={27} /></span>
              <span className="final-choice-main">
                <small>{choice.subtitle}</small>
                <strong>{choice.title}</strong>
                <p>{choice.description}</p>
                <em><Icon name="eye" size={12} /> {choice.warning}</em>
              </span>
              <span className="final-choice-progress">
                <small>已知回声</small>
                <strong>{unlocked}<i> / {total}</i></strong>
                <span>{Array.from({ length: total }, (_, dot) => <i key={dot} className={dot < unlocked ? 'filled' : ''} />)}</span>
              </span>
              <span className="final-choice-check"><Icon name={isSelected ? 'crystal' : 'compass'} size={18} /></span>
            </button>
          )
        })}
      </div>

      <div className={'final-confirm ' + (selectedChoice ? 'ready' : '')}>
        <div>
          <span className="section-kicker">ANSWER SELECTED</span>
          {selectedChoice ? (
            <>
              <strong>{FINAL_CHOICES.find((choice) => choice.id === selectedChoice)?.title}</strong>
              <p>
                这一选择将决定本轮人生的最终结局。
                {selectedEnding && selectedEnding.rank === '真结局' ? ' 星海似乎正在回应一段极深的记忆。' : ' 星海会记住你走过的每一段路。'}
              </p>
            </>
          ) : (
            <>
              <strong>还没有做出最后的回答</strong>
              <p>选中一条道路后，再向星海说出答案。</p>
            </>
          )}
        </div>
        <div className="final-confirm-actions">
          <button className="text-button" onClick={() => onOpenGallery('all')}>
            查看结局图鉴 · {meta.unlockedEndings.length}/{ENDINGS.length}
          </button>
          <button className="primary-button" onClick={onConfirm} disabled={!selectedChoice}>
            <span>向星海说出答案</span>
            <Icon name="star" size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}

interface EndingScreenProps {
  ending: Ending
  summary: RunSummary
  player: PlayerState
  meta: MetaProgress
  onRestart: () => void
  onTitle: () => void
  onGallery: () => void
}

function EndingScreen({ ending, summary, player, meta, onRestart, onTitle, onGallery }: EndingScreenProps) {
  const progress = getEndingProgress(meta)
  const topRelations = getTopRelations(player, 3)
  const job = JOBS.find((item) => item.id === player.jobId) ?? JOBS[0]
  const origin = ORIGINS.find((item) => item.id === player.originId) ?? ORIGINS[0]
  return (
    <main className={'ending-screen ending-tone-' + ending.tone}>
      <div className="ending-stars" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>

      <header className="ending-topline">
        <div className="brand-lockup">
          <div className="brand-crystal"><Icon name="crystal" size={20} /></div>
          <div>
            <span className="brand-kicker">ECHOES OF THE STAR</span>
            <strong>旅途终点</strong>
          </div>
        </div>
        <div className="ending-progress-copy">
          <span>结局图鉴</span>
          <strong>{progress.unlocked} / {progress.total}</strong>
        </div>
      </header>

      <section className="ending-hero">
        <div className="ending-rank-row">
          <span className={'ending-rank rank-' + ending.rank}>{TONE_LABELS[ending.rank]}</span>
          <i />
          <span>{ending.rank}</span>
          {summary.isNew && <em className="new-badge">NEW · 新结局</em>}
        </div>
        <span className="ending-subtitle">{ending.subtitle}</span>
        <h1>{ending.title}</h1>
        <blockquote>{ending.quote}</blockquote>
      </section>

      <section className="ending-layout">
        <article className="ending-story">
          <span className="section-kicker">EPILOGUE · 终幕之后</span>
          {ending.story.map((paragraph, index) => (
            <p key={paragraph} className={index === 0 ? 'lead-paragraph' : ''}>{paragraph}</p>
          ))}

          <div className="ending-hint">
            <Icon name="eye" size={16} />
            <div>
              <span>这段回声的触发条件</span>
              <p>{ending.hint}</p>
            </div>
          </div>
        </article>

        <aside className="ending-summary">
          <div className="summary-card">
            <div className="summary-character">
              <div className="summary-avatar"><Icon name={job.icon} size={26} /></div>
              <div>
                <small>本轮人生</small>
                <strong>{player.name}</strong>
                <span>{origin.city} · {job.name} · Lv.{player.jobLevel}</span>
              </div>
            </div>

            <div className="summary-stats">
              {(Object.keys(player.stats) as StatKey[]).map((key) => (
                <div key={key}>
                  <span>{STAT_META[key].label}</span>
                  <div><i style={{ width: player.stats[key] + '%', background: STAT_META[key].color }} /></div>
                  <strong>{player.stats[key]}</strong>
                </div>
              ))}
            </div>

            <div className="summary-numbers">
              <div><span>经历选择</span><strong>{player.choices.length}</strong></div>
              <div><span>留存金币</span><strong>{formatNumber(player.gil)}</strong></div>
              <div><span>获得星砂</span><strong className="gold-text">+{summary.dustEarned}</strong></div>
            </div>

            <div className="summary-relations">
              <span>最后仍亮着的名字</span>
              {topRelations.map((relation) => {
                const npc = NPCS.find((item) => item.id === relation.id)
                return npc ? (
                  <div key={relation.id}>
                    <Icon name={npc.icon} size={14} />
                    <span>{npc.name}</span>
                    <strong>{relation.value}</strong>
                  </div>
                ) : null
              })}
            </div>
          </div>

          <div className="summary-memory">
            <div className="memory-dust"><Icon name="spark" size={14} /> 星砂总计 {meta.dust}</div>
            <p>带着这段记忆重新投胎，下一次醒来时，所有属性都会获得额外加成。</p>
            <div className="summary-progress"><span style={{ width: progress.percent + '%' }} /></div>
            <small>结局图鉴完成度 {progress.percent}%</small>
          </div>
        </aside>
      </section>

      <div className="ending-actions">
        <button className="primary-button" onClick={onRestart}>
          <span>带着星砂再次投胎</span>
          <Icon name="moon" size={18} />
        </button>
        <button className="secondary-button" onClick={onGallery}>
          <Icon name="star" size={17} />
          查看全部结局
        </button>
        <button className="text-button" onClick={onTitle}>回到标题</button>
      </div>

      <footer className="ending-footer">
        <span>每一次结束，都会成为下一次醒来的星光。</span>
        <span>{ending.rank === '真结局' ? '你已抵达星海之外。' : '星海中仍有未听见的回声。'}</span>
      </footer>
    </main>
  )
}

interface EndingGalleryProps {
  meta: MetaProgress
  filter: GalleryFilter
  onFilter: (filter: GalleryFilter) => void
  onClose: () => void
}

function EndingGallery({ meta, filter, onFilter, onClose }: EndingGalleryProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const progress = getEndingProgress(meta)
  const filtered = filter === 'all' ? ENDINGS : ENDINGS.filter((ending) => ending.choice === filter)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="modal gallery-modal" role="dialog" aria-modal="true" aria-label="结局图鉴">
        <header className="modal-header">
          <div>
            <span className="section-kicker">MEMORY ARCHIVE · 记忆归档</span>
            <h2>星海结局图鉴</h2>
            <p>你走过的每条路，都留在星海深处。</p>
          </div>
          <div className="gallery-summary">
            <strong>{progress.unlocked}<span> / {progress.total}</span></strong>
            <small>{progress.percent}% 已解锁</small>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className="gallery-filters">
          {GALLERY_GROUPS.map((group) => {
            const count = group.id === 'all' ? ENDINGS.length : ENDINGS.filter((ending) => ending.choice === group.id).length
            const unlocked = group.id === 'all'
              ? meta.unlockedEndings.length
              : ENDINGS.filter((ending) => ending.choice === group.id && meta.unlockedEndings.includes(ending.id)).length
            return (
              <button key={group.id} className={filter === group.id ? 'active' : ''} onClick={() => onFilter(group.id)}>
                <span>{group.label}</span>
                <small>{unlocked} / {count}</small>
              </button>
            )
          })}
        </div>

        <div className="gallery-grid">
          {filtered.map((ending) => {
            const unlocked = meta.unlockedEndings.includes(ending.id)
            const isExpanded = expanded === ending.id
            return (
              <button
                key={ending.id}
                className={'ending-tile tone-' + ending.tone + (unlocked ? ' unlocked' : ' locked') + (isExpanded ? ' expanded' : '')}
                onClick={() => unlocked && setExpanded(isExpanded ? null : ending.id)}
                disabled={!unlocked}
              >
                <span className="ending-tile-top">
                  <span className={'ending-rank rank-' + ending.rank}>{TONE_LABELS[ending.rank]}</span>
                  {unlocked ? <span className="unlocked-mark"><Icon name="crystal" size={13} /> 已记录</span> : <span className="locked-mark"><Icon name="eye" size={13} /> 未听见</span>}
                </span>
                <strong>{unlocked ? ending.title : '未知的回声'}</strong>
                <em>{unlocked ? ending.subtitle : ending.hint}</em>
                {unlocked && isExpanded && (
                  <p className="ending-tile-story">{ending.story[0]}</p>
                )}
                {unlocked && <span className="tile-expand">{isExpanded ? '收起全文' : '展开记忆'} <i>→</i></span>}
                {!unlocked && <span className="tile-expand">能否抵达，取决于你走过的路</span>}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function JournalModal({ player, onClose }: { player: PlayerState; onClose: () => void }) {
  const origin = ORIGINS.find((item) => item.id === player.originId) ?? ORIGINS[0]
  const job = JOBS.find((item) => item.id === player.jobId) ?? JOBS[0]
  const guardian = GUARDIANS.find((item) => item.id === player.guardianId) ?? GUARDIANS[0]
  const currentTitle = player.chapterIndex < CHAPTERS.length ? CHAPTERS[player.chapterIndex].title : FINAL_CHAPTER.title
  const relationshipList = NPCS.map((npc) => ({ npc, value: player.relations[npc.id] ?? 20 })).sort((a, b) => b.value - a.value)
  const flags = player.flags.map((flag) => FLAG_LABELS[flag]).filter(Boolean)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="modal journal-modal" role="dialog" aria-modal="true" aria-label="旅途手记">
        <header className="modal-header">
          <div>
            <span className="section-kicker">ADVENTURER'S JOURNAL · 冒险者手记</span>
            <h2>{player.name} 的旅途</h2>
            <p>{origin.city} · {job.name} · {guardian.name}的信徒</p>
          </div>
          <div className="gallery-summary">
            <strong>Lv.{player.jobLevel}</strong>
            <small>{player.jobXp} 点职业经验</small>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className="journal-layout">
          <section className="journal-main">
            <div className="journal-current">
              <span className="section-kicker">CURRENT CHAPTER</span>
              <h3>{currentTitle}</h3>
              <div className="journal-stat-grid">
                {(Object.keys(player.stats) as StatKey[]).map((key) => (
                  <div key={key}><span style={{ color: STAT_META[key].color }}>{STAT_META[key].label}</span><strong>{player.stats[key]}</strong></div>
                ))}
              </div>
              <div className="journal-resources">
                <span><Icon name="coin" size={13} /> {formatNumber(player.gil)} 金币</span>
                <span><Icon name="book" size={13} /> {player.history.length} 段经历</span>
                <span><Icon name="spark" size={13} /> {player.memoryBonus} 灵魂加成</span>
              </div>
            </div>

            <div className="journal-timeline">
              <div className="panel-heading"><span>走过的路</span><small>JOURNEY LOG</small></div>
              {player.history.length === 0 && <p className="empty-journal">旅途刚刚开始，手记还是空白。</p>}
              {player.history.map((entry, index) => (
                <div className="timeline-entry" key={entry.timestamp + '-' + index}>
                  <span className="timeline-dot" />
                  <div>
                    <small>{entry.chapterTitle}</small>
                    <strong>{entry.choiceTitle}</strong>
                    <p>{entry.resultTitle} · {entry.consequence}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="journal-side">
            <div className="journal-side-block">
              <div className="panel-heading"><span>拂晓关系</span><small>BONDS</small></div>
              <div className="journal-relations">
                {relationshipList.map(({ npc, value }) => (
                  <div key={npc.id}>
                    <span style={{ color: npc.color }}><Icon name={npc.icon} size={15} /></span>
                    <div>
                      <span>{npc.name}</span>
                      <div className="relation-track"><i style={{ width: value + '%', background: npc.color }} /></div>
                    </div>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="journal-side-block">
              <div className="panel-heading"><span>灵魂印记</span><small>MEMORIES</small></div>
              <div className="flag-cloud">
                {flags.length ? flags.map((flag) => <span key={flag}>{flag}</span>) : <p>还没有留下特殊印记。</p>}
              </div>
            </div>

            <div className="journal-side-block journal-note">
              <Icon name="crystal" size={22} />
              <p>“旅途的意义不只在终点。那些没被记录的闲聊、灭团与等待，也构成了你。”</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
