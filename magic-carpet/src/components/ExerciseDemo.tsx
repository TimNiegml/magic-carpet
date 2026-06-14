// 动作示范：优先显示真人 GIF（gifUrl），否则用内置 SVG 示意动画。
// 内置示意动画当前覆盖颈椎 5 个核心动作，其余动作待补真人示范。

const C = '#06B6D4' // cervical 强调色

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl bg-slate-900/60">
      <svg viewBox="0 0 120 90" className="h-full w-full" fill="none" stroke={C} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      <span className="absolute bottom-1 right-2 text-[10px] text-slate-500">示意动画</span>
    </div>
  )
}

// 颏收缩：侧面头部水平后收
function ChinTuck() {
  return (
    <Frame>
      <line x1="78" y1="20" x2="78" y2="74" />
      <line x1="78" y1="74" x2="96" y2="74" />
      <g className="anim-tuck">
        <circle cx="60" cy="34" r="13" />
        <path d="M47 34 l-7 3 l7 3" />
      </g>
      <path d="M40 18 h22" stroke="#475569" strokeWidth={1.6} strokeDasharray="3 3" />
      <path d="M58 18 l5 -3 m-5 3 l5 3" stroke="#475569" strokeWidth={1.6} />
    </Frame>
  )
}

// 斜方肌拉伸：头部向一侧倾斜
function TrapStretch() {
  return (
    <Frame>
      <line x1="38" y1="64" x2="82" y2="64" />
      <g className="anim-tilt">
        <line x1="60" y1="64" x2="60" y2="44" />
        <circle cx="60" cy="32" r="12" />
        <path d="M60 22 q12 -8 18 2" stroke="#475569" strokeWidth={1.8} />
      </g>
    </Frame>
  )
}

// 胸椎旋转：上方手臂向后打开
function ThoracicRotation() {
  return (
    <Frame>
      <circle cx="60" cy="56" r="6" fill={C} stroke="none" />
      <line x1="60" y1="56" x2="60" y2="82" stroke="#475569" />
      <g className="anim-rotate">
        <line x1="60" y1="56" x2="60" y2="22" />
        <circle cx="60" cy="20" r="4" fill={C} stroke="none" />
      </g>
      <path d="M84 40 a30 30 0 0 1 -10 20" stroke="#475569" strokeWidth={1.6} strokeDasharray="3 3" />
    </Frame>
  )
}

// 弹力带拉肩：双手水平拉开
function BandPullApart() {
  return (
    <Frame>
      <g className="anim-spread-l">
        <line x1="60" y1="45" x2="42" y2="45" />
        <circle cx="40" cy="45" r="5" fill={C} stroke="none" />
      </g>
      <g className="anim-spread-r">
        <line x1="60" y1="45" x2="78" y2="45" />
        <circle cx="80" cy="45" r="5" fill={C} stroke="none" />
      </g>
      <path d="M52 60 h16 M50 66 h20" stroke="#475569" strokeWidth={1.6} />
    </Frame>
  )
}

// 面拉：绳索拉向面部，肘部打开
function FacePull() {
  return (
    <Frame>
      <circle cx="34" cy="45" r="12" />
      <g className="anim-pull">
        <line x1="100" y1="45" x2="68" y2="45" strokeDasharray="4 3" />
        <line x1="68" y1="45" x2="56" y2="33" />
        <line x1="68" y1="45" x2="56" y2="57" />
        <circle cx="55" cy="31" r="3.5" fill={C} stroke="none" />
        <circle cx="55" cy="59" r="3.5" fill={C} stroke="none" />
      </g>
    </Frame>
  )
}

const REGISTRY: Record<string, () => JSX.Element> = {
  chin_tuck: ChinTuck,
  trap_stretch: TrapStretch,
  thoracic_rotation: ThoracicRotation,
  band_pull_apart: BandPullApart,
  face_pull_cervical: FacePull,
  face_pull: FacePull,
}

export function hasDemo(id: string, gifUrl?: string): boolean {
  return !!gifUrl || id in REGISTRY
}

export default function ExerciseDemo({ id, gifUrl, name }: { id: string; gifUrl?: string; name?: string }) {
  if (gifUrl) {
    return (
      <div className="relative h-40 overflow-hidden rounded-xl bg-slate-900/60">
        <img src={gifUrl} alt={name ? `${name} 示范` : '动作示范'} className="h-full w-full object-contain" loading="lazy" />
      </div>
    )
  }
  const Demo = REGISTRY[id]
  if (!Demo) return null
  return <Demo />
}
