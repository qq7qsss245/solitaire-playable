interface GlobalType {
  started: boolean,
  orientation: 0|1,
  current?: Phaser.GameObjects.Image,
  puzzle: string[][]
  currentIndex: number;
}

export const Global: GlobalType = {
  started: false,
  orientation: 0,
  current: undefined,
  currentIndex: 0,
  puzzle: [
    ['darkBlue','yellow','yellow','darkBlue', 'red', 'darkBlue', 'darkBlue','red'],
    ['darkBlue', 'orange', 'red','red', 'orange', 'orange', 'yellow', 'yellow'],
    ['darkBlue',  'yellow', 'yellow', 'orange', 'red', 'orange', 'red' , 'orange'],
    ['darkBlue', 'yellow', 'red', 'yellow', 'red', 'darkBlue', 'orange', 'orange'],
    ['green', 'green', 'green', 'green', 'green', 'green', 'green'],
    ['green'],
    []
  ]
};
