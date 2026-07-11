// worlds.js — 服务端世界库（含"秘密"，仅后端可见；绝不把整份 world 下发给前端）
// 每个世界：设定 + 3~5 个 soul 种子（含 secret）+ 暗线节拍 beats + 汇聚变体 convergence

const STORM_LIGHTHOUSE = {
  id: 'storm-lighthouse',
  title: '潮汐灯塔 · 风暴夜',
  logline: '风暴将至的孤岛旧灯塔，一艘船正驶向礁石，而今夜每个人都藏着一件事。',
  setting: '一座远离大陆的孤岛，岛上只有一座旧灯塔。今夜有大风暴，海图显示一艘货船正朝这片布满暗礁的海域驶来。灯，今晚必须亮。',
  tone: '温柔而克制的悬念感；像海浪一样一层层推进，不惊吓、不喧哗，把张力藏在细节与沉默里。',
  player_role: {
    name: '你',
    who: '一名被风暴困在岛上的旅人，本只想借宿一夜，却在不经意间成了今夜的关键。',
    can_influence: '你的选择会牵动三个人的心事与抉择，最终决定这艘船与这座灯塔的命运。'
  },
  souls: [
    {
      name: '老周',
      role: '守塔人，在这座灯塔守了四十年',
      core_desire: '守住"我守的灯从未熄过"这句话——这是他一生的名节。',
      values: ['责任高于一切', '报喜不报忧，宁可自己扛'],
      secret: '灯芯的机件三天前坏了，他一直瞒着所有人。今夜风暴里，这盏灯未必点得亮。',
      relationship_to_player_init: '客气而疏离，把你当过路客',
      opening_mood: '强撑的镇定，眼神时不时飘向灯室',
      arc_path: ['隐瞒', '被逼到墙角', '坦白或崩溃', '选择如何面对']
    },
    {
      name: '阿岚',
      role: '灯塔学徒兼信号员，二十出头',
      core_desire: '离开这座岛，去大陆过自己的人生。',
      values: ['自己的人生优先', '不想把一辈子耗在别人的灯上'],
      secret: '他在礁石背面藏了一条小船，打算趁风暴彻底压过来之前，今夜独自离岛。',
      relationship_to_player_init: '好奇又戒备，怕你看穿他',
      opening_mood: '心不在焉，反复看向门外的海',
      arc_path: ['蠢蠢欲动', '机会与良心的拉扯', '走或留', '承担后果']
    },
    {
      name: '苏晴',
      role: '风暴中登岛的女子，浑身湿透',
      core_desire: '见一个人，了结一桩埋了很多年的心事。',
      values: ['真相重于体面', '有些话再不说就没机会了'],
      secret: '她是老周失联多年的女儿。她回来，是因为收到一封"灯塔即将关闭"的信——她怕再不来，就见不到父亲和这座灯了。',
      relationship_to_player_init: '沉默，礼貌地保持距离',
      opening_mood: '疲惫里压着一股非说不可的决心',
      arc_path: ['试探', '身份呼之欲出', '点破或退缩', '和解或错过']
    }
  ],
  // 暗线节拍：act=所属幕；after_turn=最早可触发回合；involves=涉及角色；cue=情境；hint=给DeepSeek的推演方向
  beats: [
    { id: 'b1_lamp_risk', act: 1, after_turn: 1, involves: ['老周'], cue: '灯室传来异响，老周神色一紧', hint: '老周极力遮掩灯芯问题，可能对你撒一个小谎；也可能露出破绽。' },
    { id: 'b2_boat', act: 2, after_turn: 2, involves: ['阿岚'], cue: '阿岚几次想往门外走', hint: '阿岚在"趁乱离岛"和"良心"之间摇摆；他的抉择取决于是否被看穿、以及你对他的态度。' },
    { id: 'b3_identity', act: 2, after_turn: 3, involves: ['苏晴', '老周'], cue: '苏晴看着老周的手，欲言又止', hint: '苏晴的身份逐渐浮现；她可能点破，也可能临阵退缩。老周或有所察觉。' },
    { id: 'b2b_ask_help', act: 2, after_turn: 3, involves: ['老周'], cue: '老周迟疑着，最终把目光转向你', hint: '老周开口请你帮个忙、或试探你是否可信；让他直接对你说话、把某样东西交到你手里。' },
    { id: 'b3b_confide', act: 2, after_turn: 4, involves: ['苏晴'], cue: '苏晴走近你，声音很轻', hint: '苏晴向你吐露一点心事、问你一个问题、或托付你一件事；让她与你直接互动。' },
    { id: 'b3c_arlan', act: 2, after_turn: 5, involves: ['阿岚'], cue: '阿岚拦住你', hint: '阿岚也许求你替他保守秘密、拉你一起走、或因你的态度而动摇；让他直接面对你。' },
    { id: 'b4_ship_near', act: 3, after_turn: 5, involves: ['老周', '阿岚', '苏晴'], cue: '船的灯影已能看见，正朝暗礁来', hint: '危机逼到眼前，灯的问题再也瞒不住。每个人的秘密在此刻被迫摊开，都在等你表态、都需要你做点什么。' }
  ],
  convergence: {
    trigger: { act: 3, min_turn: 6 },
    variants: [
      { id: 'A_light_on', title: '灯亮了', when: '众人（尤其在你的促成下）合力修好灯、彼此的隔阂被打开', tone: '温暖、释然；父女相认或和解，船安全通过' },
      { id: 'B_human_beacon', title: '以人代灯', when: '灯终究修不好，但人们没有放弃——用篝火/信号弹/举火为船引航', tone: '悲壮而动人；救下了船，也照见了彼此' },
      { id: 'C_missed', title: '错过', when: '隔阂未解，或阿岚带走关键之物离岛，灯未亮', tone: '苦涩、留白；船的命运与未说出口的话一同沉入夜里' }
    ]
  },
  scenes: {
    intro: '风暴将至的黄昏，一座孤岛上的旧石砌灯塔矗立在礁石海岸，铅灰色云层压向海面，远处一点渔火',
    act1: '灯塔昏黄的灯室内，老旧的黄铜灯具与齿轮，窗外暮色四合，海风掀动窗帘',
    act2: '风暴渐起，海浪拍打礁石，灯塔立在雨幕中，远处海面一艘货船的轮廓若隐若现',
    act3: '狂暴的风暴之夜，巨浪滔天，货船逼近布满暗礁的海域，灯塔是黑暗中唯一的焦点',
    endings: {
      A_light_on: '风暴退去的黎明，灯塔的光柱刺破残云，海面平静，货船安然远去，暖光笼罩',
      B_human_beacon: '风暴之夜，人们在灯塔前举起火把与信号弹，橙红火光在雨中为船引航，悲壮而温暖',
      C_missed: '风暴后死寂的清晨，灯塔黯淡无光，灰白的海面空茫，一种苦涩的留白'
    }
  },
  act_clock: { acts: 3, target_turns: 12, act2_at: 3, act3_at: 7 },
  default_params: { surprise: 40, seed: 0, story_level: 80, pace: 15, agency: 60 }
};

export default { 'storm-lighthouse': STORM_LIGHTHOUSE };
