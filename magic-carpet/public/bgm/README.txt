把你的背景音乐放到这个文件夹，文件名要对应世界基调：

  suspense.mp3  —— 悬疑基调（副本/推理：噤声·归零、说谎者·圆桌、聂小倩）
  calm.mp3      —— 清冷基调（潮汐灯塔）

前端会自动循环播放 /bgm/<基调>.mp3，旁白朗读时自动压低音量，读完回升。
找不到文件时静默（不影响其他功能）。

免版权可用来源（自用/商用都安全）：
  - Pixabay Music (pixabay.com/music)  搜 suspense / dark ambient / thriller
  - Free Music Archive (freemusicarchive.org)  选 CC 许可
  - YouTube Audio Library
下载后重命名为 suspense.mp3 / calm.mp3 放进本文件夹，vercel --prod 重新部署即可。
