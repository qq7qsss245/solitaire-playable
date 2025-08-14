# 1. 项目概述
当前项目是一个基于Phaser 3 + TypeScript开发的找不同游戏。玩家需要在将所有纸牌从小到大按照花色排列摆放至对应花色的卡槽中。

# 2. 技术架构
- 游戏引擎：Phaser 3
- 开发语言：TypeScript
- 构建工具：Vite
- 项目结构：
  ```
  src/
  ├── game/
  │   ├── scenes/         # 游戏场景
  │   ├── components/     # 游戏组件
  │   └── EventBus.ts     # 事件系统
  ├── assets/            # 资源文件
  └── config/           # 配置文件