# Knowledge World Layer Loops

三首音乐延续 `knowledge_world_main_loop` 的主题动机，分别对应 How / Why / System 三层。每首都导出 `wav`、`ogg`、`mp3` 三种格式，前端优先使用 `ogg`。

## 文件

- `knowledge_world_how_loop.wav` / `.ogg` / `.mp3`：48 秒，80 BPM，44.1kHz stereo
- `knowledge_world_why_loop.wav` / `.ogg` / `.mp3`：48 秒，80 BPM，44.1kHz stereo。新版降低压迫低频和不协和音，保留深度但更温暖。
- `knowledge_world_system_loop.wav` / `.ogg` / `.mp3`：48 秒，80 BPM，44.1kHz stereo。新版去掉刺耳 glass/choir 高频，改为柔和星光 pad 与轻铃音。

## 设计

- How：重复钢琴动机、轻木质节奏，表现结构开始形成。
- Why：温暖 cello drone、稀疏钢琴、很轻的低频呼吸，表现深入追问但不制造压迫感。
- System：soft pad、gentle bell、少量 shimmer，表现宏观连接和洞察，避免尖锐或神圣过头。
- 建议前端切层时使用 1.5 秒 crossfade，避免硬切。
