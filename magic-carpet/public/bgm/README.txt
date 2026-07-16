背景音乐（按世界/场景自动切换，前端从 /bgm/<曲名>.mp3 播放）

曲目 → 场景映射（在 api/_worlds.js 的 bgm_map 里配置）：
  潮汐灯塔    ：Long_Note_Two（常规）/ Echoes_of_Time（高潮）
  兰若寺·聂小倩：Echoes_of_Time（常规）/ Anxiety（高潮）
  噤声·归零    ：Ossuary_1_A_Beginning（开场）/ Dark_Times / Static_Motion（高潮）
  说谎者·圆桌  ：Ossuary_1_A_Beginning（陈述）/ Dark_Times（质询）/ Anxiety（投票）

音乐版权 / 署名（CC-BY 4.0，必须保留署名）：
  以下曲目 by Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0
  Anxiety / Dark Times / Echoes of Time / Long Note Two / Ossuary 1 - A Beginning / Static Motion
  http://creativecommons.org/licenses/by/4.0/

想换曲子：把新文件放进本文件夹并在 _worlds.js 的 bgm_map 改成对应文件名（不含 .mp3）即可。
