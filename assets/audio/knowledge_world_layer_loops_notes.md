# Knowledge World Layer Loops

三首音乐延续 `knowledge_world_main_loop` 的主题动机，分别对应 How / Why / System 三层。每首都导出 `wav`、`ogg`、`mp3` 三种格式，前端优先使用 `ogg`。

## 文件

- `knowledge_world_how_loop.wav` / `.ogg` / `.mp3`：48 秒，80 BPM，44.1kHz stereo
- `knowledge_world_why_loop.wav` / `.ogg` / `.mp3`：48 秒，80 BPM，44.1kHz stereo。新版进一步削弱 120Hz 以下低频，并衰减 160-240Hz 的闷压感，保留深度但更舒适。
- `knowledge_world_system_loop.wav` / `.ogg` / `.mp3`：48 秒，80 BPM，44.1kHz stereo。新版进一步削弱低频，只保留柔和星光 pad 与轻铃音。

## 设计

- How：重复钢琴动机、轻木质节奏，表现结构开始形成。
- Why：温暖 pad、稀疏钢琴、极弱低频呼吸，表现深入追问但不制造压迫感。
- System：soft pad、gentle bell、少量 shimmer，表现宏观连接和洞察，避免尖锐或神圣过头。
- 建议前端切层时使用 1.5 秒 crossfade，避免硬切。
