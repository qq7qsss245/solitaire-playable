# Board组件实现

## 1. 属性
```typescript
image: Phaser.GameObjects.Image;        // 游戏背景
points: Phaser.GameObjects.Image[] = []; // 翻卡区域位置列表
isRightSide: boolean;                   // 判断是否为牌堆区域
```

## 2. 游戏区域处理
- 坐标计算：
  * 游戏区域部分：直接使用配置坐标
- 点击判定：
  * 牌堆区域使用矩形判定区域（Phaser.Geom.Rectangle）
  * 翻卡区域使用矩形判定区域（（Phaser.Geom.Rectangle）（参考3.3部分卡牌位置）
  * 设置depth=100确保在最上层
  * 点击时发送side信息（'Calculate'或'Ready'）到事件系统

## 3. 点击成功判断
- 检查点击卡牌是否可移动：
  * 获取卡牌数值与花色：getCardValue(card)； getCardSuit(card)
  * 判断是否可以移动：isConsecutiveDescending(card1, card2)（数值）；isSameSuit(card1, card2)（花色）
  * 是否可以放置：isMovable(card, destinationPile)

## 4. 自适应处理
- 监听resize事件
- 重新计算裁剪区域
- 更新差异点位置和判定区域
- 保持图片比例不变
- 保持10px透明区域