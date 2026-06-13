import type { DayPlan, Exercise } from '../types'

// ──────────────────────────────────────────────
// 颈椎专项（每次训练前后必做）
// ──────────────────────────────────────────────
export const CERVICAL_EXERCISES: Exercise[] = [
  {
    id: 'chin_tuck',
    name: '颏收缩',
    nameEn: 'Chin Tuck',
    sets: 2,
    reps: '10次×10秒',
    cue: '靠墙站立，下颌内收，感受后颈拉伸',
    isCervical: true,
    focus: '激活颈深屈肌，纠正头前伸（乌龟颈），是缓解久坐颈椎问题的第一动作',
    steps: [
      '后脑、上背、臀部贴墙站立或坐直，目视前方',
      '想象有根线把后脑往墙上轻轻拉，下颌水平向后收（像挤出双下巴）',
      '后颈有被拉长的感觉，保持 10 秒，全程不要低头或抬头',
      '缓慢回到中立位，重复',
    ],
    mistakes: ['用力低头而不是水平后收', '耸肩、屏气', '速度太快、没有保持'],
    breathing: '后收时缓慢呼气，保持时自然呼吸',
    cervicalNote: '这是最重要的颈椎康复动作，建议每天工作间隙也做几组',
  },
  {
    id: 'face_pull_cervical',
    name: '面拉',
    nameEn: 'Face Pull',
    sets: 3,
    reps: '15次',
    cue: '绳索拉至鼻尖，肘部向后打开',
    isCervical: true,
    focus: '强化后肩与中下斜方肌，对抗圆肩驼背，稳定肩颈',
    steps: [
      '绳索/弹力带调至略高于头，双手对握绳头',
      '后退至有张力，手臂伸直、肩胛微微下沉',
      '向鼻尖方向拉，肘部向两侧后方打开，做出"双手比 V"的姿势',
      '顶峰挤压后肩 1 秒，缓慢还原',
    ],
    mistakes: ['用斜方肌上部耸肩发力', '只用手臂没有打开肩胛', '重量过大导致身体后仰借力'],
    breathing: '拉的时候呼气，还原时吸气',
    cervicalNote: '颈椎友好，能直接改善低头族的肩颈紧张',
  },
  {
    id: 'thoracic_rotation',
    name: '胸椎旋转',
    nameEn: 'Thoracic Rotation',
    sets: 1,
    reps: '每侧10次',
    cue: '侧卧，上身旋转打开，下半身保持不动',
    isCervical: true,
    focus: '恢复胸椎旋转活动度，胸椎僵硬会让颈椎代偿受累',
    steps: [
      '侧卧，双膝并拢屈髋 90°，下方腿用上方膝压住固定',
      '双臂前平举掌心相对',
      '上方手画大弧向后打开，眼睛跟随手，胸口朝向天花板',
      '感受胸前与上背伸展，缓慢返回',
    ],
    mistakes: ['膝盖离地（骨盆跟着翻转）', '只转手臂不转胸椎', '动作过快'],
    breathing: '打开时深吸气，返回时呼气',
    cervicalNote: '颈椎不适者优先松动胸椎，往往颈部立刻轻松',
  },
  {
    id: 'trap_stretch',
    name: '斜方肌拉伸',
    nameEn: 'Trap Stretch',
    sets: 1,
    reps: '每侧30秒',
    cue: '头侧偏，对侧手轻拉至耳后，感受侧颈拉伸',
    isCervical: true,
    focus: '放松紧张的上斜方肌与肩胛提肌，缓解颈肩酸胀',
    steps: [
      '坐直，右手放身后或抓住椅子固定右肩',
      '头向左侧偏，左手轻搭头顶右侧',
      '用手的重量（不要硬拉）让左耳靠近左肩，感受右侧颈部拉伸',
      '保持 30 秒，换边',
    ],
    mistakes: ['用力猛拉头部', '耸肩', '身体歪斜代偿'],
    breathing: '保持时缓慢深呼吸，每次呼气放松一点',
    cervicalNote: '酸胀时轻柔进行，疼痛（非酸胀）应立即停止',
  },
  {
    id: 'band_pull_apart',
    name: '弹力带拉肩',
    nameEn: 'Band Pull Apart',
    sets: 3,
    reps: '20次',
    cue: '双手持带与肩同宽，水平拉开至胸前展开',
    isCervical: true,
    focus: '激活肩胛稳定肌与后肩，热身与改善姿态的万能动作',
    steps: [
      '双手与肩同宽握住弹力带，手臂前平举与肩同高',
      '保持手臂伸直，向两侧水平拉开弹力带',
      '拉到带子贴近胸口、肩胛骨向中间夹紧',
      '控制速度缓慢还原，全程保持张力',
    ],
    mistakes: ['耸肩', '手臂下垂变成扩胸', '快速甩动靠惯性'],
    breathing: '拉开时呼气，还原时吸气',
    cervicalNote: '训练前做 2 组当热身，肩颈会更稳定',
  },
]

// ──────────────────────────────────────────────
// 默认周计划
// ──────────────────────────────────────────────
export const DEFAULT_WEEK_PLAN: DayPlan[] = [
  {
    dayOfWeek: 1, // 周一
    sessionType: 'gym_push',
    durationMin: 60,
    exercises: [
      {
        id: 'db_bench',
        name: '哑铃卧推',
        nameEn: 'DB Bench Press',
        sets: 3,
        reps: '10-12',
        cue: '肩胛骨收紧贴凳，腰背保持自然弧度',
        isCervical: false,
        focus: '胸大肌、前束、三头',
        steps: [
          '仰卧，双脚踩实地面，肩胛骨后收下沉贴紧凳面',
          '双手持铃位于胸部两侧，肘约 45°（不要完全外展）',
          '向上推起至手臂接近伸直，哑铃在胸部正上方',
          '缓慢下放至胸侧有拉伸感，全程控制',
        ],
        mistakes: ['肩胛松散、肩膀前顶', '下放过快、弹胸', '手腕后折'],
        breathing: '下放吸气，推起呼气',
        cervicalNote: '头部放松贴凳，不要抬头看哑铃',
      },
      {
        id: 'db_shoulder_press',
        name: '坐姿哑铃推肩',
        nameEn: 'Seated DB Shoulder Press',
        sets: 3,
        reps: '10-12',
        cue: '不要过度耸肩，核心收紧',
        isCervical: false,
        focus: '三角肌前/中束',
        steps: [
          '坐姿靠背挺直，核心收紧，哑铃举至耳侧',
          '手肘略在身体前方，不要完全打到正侧面',
          '向上推至手臂接近伸直，不要锁死',
          '控制下放回耳侧高度',
        ],
        mistakes: ['耸肩借力', '腰部过度后弓', '下放过浅'],
        breathing: '推起呼气，下放吸气',
        cervicalNote: '推举时保持下巴微收，避免颈部前伸用力',
      },
      {
        id: 'db_lateral_raise',
        name: '侧平举',
        nameEn: 'Lateral Raise',
        sets: 3,
        reps: '12-15',
        cue: '小拇指略高，控制下放',
        isCervical: false,
        focus: '三角肌中束（练出肩宽）',
        steps: [
          '站立微屈肘，哑铃置于身体两侧',
          '想象"倒水"，小拇指略高，向两侧抬起',
          '抬到与肩同高即可，不要耸肩',
          '用 2-3 秒缓慢下放',
        ],
        mistakes: ['重量过大靠甩', '耸肩用斜方肌', '抬过肩高'],
        breathing: '抬起呼气，下放吸气',
      },
      {
        id: 'tricep_pushdown',
        name: '绳索下压（三头）',
        nameEn: 'Tricep Pushdown',
        sets: 3,
        reps: '12-15',
        cue: '肘部固定，只动前臂',
        isCervical: false,
        focus: '肱三头肌',
        steps: [
          '面对绳索，双手握把，上臂夹紧身体两侧',
          '保持肘部位置固定，向下伸直前臂',
          '底部稍微外分绳头、挤压三头',
          '控制还原至前臂约 90°',
        ],
        mistakes: ['肘部前后晃动', '身体前倾压重量', '耸肩'],
        breathing: '下压呼气，还原吸气',
      },
    ],
  },
  {
    dayOfWeek: 2, // 周二
    sessionType: 'swim',
    durationMin: 40,
    exercises: [],
  },
  {
    dayOfWeek: 3, // 周三
    sessionType: 'gym_lower',
    durationMin: 60,
    exercises: [
      {
        id: 'squat',
        name: '深蹲（杠铃/哑铃）',
        nameEn: 'Squat',
        sets: 4,
        reps: '8-10',
        cue: '膝盖对准脚尖，不要内扣',
        isCervical: false,
        focus: '股四头肌、臀大肌、核心',
        steps: [
          '双脚略宽于肩，脚尖微外展',
          '核心收紧，髋膝同时下蹲，臀部向后向下坐',
          '下蹲至大腿接近水平，膝盖方向与脚尖一致',
          '脚跟发力站起，顶端不要过度顶髋',
        ],
        mistakes: ['膝盖内扣', '脚跟离地', '弓腰或过度低头'],
        breathing: '下蹲吸气，站起呼气',
        cervicalNote: '目视前下方约 2 米，保持颈部与脊柱一条线，切勿抬头看天花板',
      },
      {
        id: 'rdl',
        name: '罗马尼亚硬拉',
        nameEn: 'Romanian Deadlift',
        sets: 3,
        reps: '10-12',
        cue: '髋关节主导，背部保持平直',
        isCervical: false,
        focus: '臀大肌、腘绳肌、下背稳定',
        steps: [
          '直立持铃于大腿前，膝盖微屈固定不变',
          '臀部向后推（送髋），上身随之前倾',
          '哑铃贴腿下放至腘绳肌有明显拉伸（约膝下）',
          '臀部发力送髋站直，顶端夹臀',
        ],
        mistakes: ['弓背圆背', '变成深蹲（膝盖大幅弯曲）', '重量离开身体'],
        breathing: '下放吸气，起身呼气',
        cervicalNote: '颈部跟随脊柱，不要抬头，下巴微收',
      },
      {
        id: 'split_squat',
        name: '保加利亚分腿蹲',
        nameEn: 'Bulgarian Split Squat',
        sets: 3,
        reps: '每腿10次',
        cue: '重心垂直下落，不要前冲',
        isCervical: false,
        focus: '单腿臀腿力量、平衡',
        steps: [
          '后脚搭在凳上，前脚向前迈一大步',
          '上身略前倾，重心垂直下沉',
          '前侧大腿接近水平，前膝不过度超脚尖',
          '前脚跟发力站起',
        ],
        mistakes: ['步幅太小膝盖前顶', '身体左右晃', '后腿借力'],
        breathing: '下蹲吸气，站起呼气',
      },
      {
        id: 'plank',
        name: '平板支撑',
        nameEn: 'Plank',
        sets: 3,
        reps: '30-45秒',
        cue: '臀部不要塌腰，呼吸均匀',
        isCervical: false,
        focus: '核心稳定（腹横肌）',
        steps: [
          '前臂与脚尖支撑，肘在肩正下方',
          '收紧核心与臀部，身体成一条直线',
          '骨盆微后倾避免塌腰',
          '保持均匀呼吸，到时间为止',
        ],
        mistakes: ['塌腰翘臀', '低头或抬头', '憋气'],
        breathing: '全程均匀呼吸，不要憋气',
        cervicalNote: '颈部保持中立，眼睛看向双手前方地面，不要抬头',
      },
      {
        id: 'dead_bug',
        name: '死虫式',
        nameEn: 'Dead Bug',
        sets: 3,
        reps: '每侧8次',
        cue: '腰背全程贴地，对角线缓慢伸展',
        isCervical: false,
        focus: '核心抗伸展、腰椎稳定',
        steps: [
          '仰卧，双手指向天花板，髋膝屈曲 90°',
          '腰部主动压向地面（不留缝隙）',
          '对侧手脚缓慢伸展接近地面，保持腰贴地',
          '收回换边',
        ],
        mistakes: ['腰部拱起离地', '动作过快', '憋气'],
        breathing: '伸展时缓慢呼气，收回时吸气',
        cervicalNote: '头轻放地面，避免抬头让颈部紧张',
      },
    ],
  },
  {
    dayOfWeek: 4, // 周四
    sessionType: 'rest',
    durationMin: 15,
    exercises: [],
  },
  {
    dayOfWeek: 5, // 周五
    sessionType: 'gym_pull',
    durationMin: 60,
    exercises: [
      {
        id: 'db_row',
        name: '哑铃单臂划船',
        nameEn: 'One-arm DB Row',
        sets: 4,
        reps: '10-12',
        cue: '拉到腰侧，顶峰收缩背阔肌',
        isCervical: false,
        focus: '背阔肌、中背',
        steps: [
          '一手一膝撑凳，背部平直与地面接近平行',
          '另一手垂直持铃自然下垂',
          '肘贴身向后拉至腰侧，肩胛后收',
          '顶峰挤压背部，控制下放',
        ],
        mistakes: ['身体转动借力', '耸肩用斜方肌', '只用手臂不夹背'],
        breathing: '拉起呼气，下放吸气',
        cervicalNote: '颈部与脊柱一条线，不要抬头看前方',
      },
      {
        id: 'cable_row',
        name: '坐姿绳索划船',
        nameEn: 'Seated Cable Row',
        sets: 3,
        reps: '12',
        cue: '坐直，不要借腰部摇摆',
        isCervical: false,
        focus: '中背、背阔肌、后肩',
        steps: [
          '坐直，膝微屈，双手握把',
          '挺胸沉肩，向腹部方向拉把手',
          '肘贴身后拉，肩胛骨向中间夹',
          '控制还原，前伸时保持挺胸不弓背',
        ],
        mistakes: ['身体大幅前后摇摆', '弓背前伸', '耸肩'],
        breathing: '拉回呼气，前伸吸气',
        cervicalNote: '下巴微收，不要前探脖子',
      },
      {
        id: 'face_pull',
        name: '面拉',
        nameEn: 'Face Pull',
        sets: 3,
        reps: '15-20',
        cue: '拉至鼻尖高度，肩外旋，肘打开',
        isCervical: true,
        focus: '后肩、中下斜方肌（护肩护颈）',
        steps: [
          '绳索调高于头，双手对握',
          '后退保持张力，肩胛下沉',
          '向鼻尖方向拉，肘向两侧后方打开',
          '顶峰挤压后肩，缓慢还原',
        ],
        mistakes: ['耸肩', '只用手臂', '身体后仰借力'],
        breathing: '拉时呼气，还原吸气',
        cervicalNote: '颈椎专项动作，对久坐圆肩特别有效',
      },
      {
        id: 'reverse_fly',
        name: '反向飞鸟',
        nameEn: 'Reverse Fly',
        sets: 3,
        reps: '15',
        cue: '手臂微弯，主用后三角',
        isCervical: false,
        focus: '后三角肌、上背',
        steps: [
          '俯身或坐姿前倾，手臂微屈持轻铃',
          '想象"展翅"，向两侧后方抬起',
          '抬至与肩同高，挤压后肩与上背',
          '控制下放',
        ],
        mistakes: ['重量过大借惯性', '耸肩', '手臂完全伸直靠手腕'],
        breathing: '抬起呼气，下放吸气',
      },
      {
        id: 'bicep_curl',
        name: '哑铃弯举',
        nameEn: 'DB Bicep Curl',
        sets: 3,
        reps: '12',
        cue: '肘部贴身，完整屈伸',
        isCervical: false,
        focus: '肱二头肌',
        steps: [
          '直立持铃，上臂夹紧身体两侧',
          '保持肘部位置不动，弯举至顶',
          '顶峰挤压二头，缓慢下放',
          '底部完全伸展（不锁死甩动）',
        ],
        mistakes: ['身体后仰借力', '肘部前移', '下放过快'],
        breathing: '弯举呼气，下放吸气',
      },
    ],
  },
  {
    dayOfWeek: 6, // 周六
    sessionType: 'outdoor',
    durationMin: 90,
    exercises: [],
  },
  {
    dayOfWeek: 0, // 周日
    sessionType: 'rest',
    durationMin: 0,
    exercises: [],
  },
]

// 12 周计划阶段说明
export interface PhaseInfo {
  name: string
  weeks: string
  weekStart: number
  weekEnd: number
  goal: string
  detail: string
}

export const PHASES: PhaseInfo[] = [
  {
    name: '第一阶段 · 重建',
    weeks: '第 1-4 周',
    weekStart: 1,
    weekEnd: 4,
    goal: '建立动作模式 + 颈椎康复打底',
    detail: '以中等重量、标准动作为主，重点掌握每个动作的发力和颈椎专项习惯。每次训练前后必做颈椎 5 件套，缓解久坐紧张。',
  },
  {
    name: '第二阶段 · 增肌',
    weeks: '第 5-8 周',
    weekStart: 5,
    weekEnd: 8,
    goal: '渐进超负荷，增加肌肉量',
    detail: '在动作标准的前提下逐步加重或加次数，推/拉/腿循环刺激。保持游泳与户外作为有氧和恢复，颈椎专项不间断。',
  },
  {
    name: '第三阶段 · 强化',
    weeks: '第 9-12 周',
    weekStart: 9,
    weekEnd: 12,
    goal: '提升力量与体能，巩固体态',
    detail: '强度进一步提升，强化核心与后链，体态明显改善。网球/游泳提升运动表现，颈椎问题应已显著缓解。',
  },
]

// 按 dayOfWeek 取计划
export function getDayPlan(plan: DayPlan[], dayOfWeek: number): DayPlan | undefined {
  return plan.find((d) => d.dayOfWeek === dayOfWeek)
}

// 所有动作（动作库用）
export function allExercises(plan: DayPlan[]): Exercise[] {
  const map = new Map<string, Exercise>()
  for (const e of CERVICAL_EXERCISES) map.set(e.id, e)
  for (const d of plan) for (const e of d.exercises) if (!map.has(e.id)) map.set(e.id, e)
  return [...map.values()]
}
