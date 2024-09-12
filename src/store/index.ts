import { createStore, createModel } from '@ice/store';


interface Card {
  suit: string;
  back: boolean;
}

interface Model {
  fills: [Card[], Card[], Card[], Card[]],
  size: 'big'| 'small',
  decks: Card[][],
  stacks: Card[],
  stacks_current: string;
  orientation: 1|0;
}

const initialState: Model = {
  fills: [[], [], [], []],
  size: 'small',
  stacks: [],
  stacks_current: '',
  decks: [
    [{ suit: 'f_3', back: false }],
    [
      { suit: 'f_5', back: true },
      { suit: 'f_4', back: false }
    ],
    [
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_J', back: false }
    ],
    [      
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 's_8', back: false }
    ],
    [
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_K', back: false }
    ],
    [
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 's_K', back: false }
    ],
    [
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_5', back: true },
      { suit: 'f_A', back: false }
    ],
  ],
  orientation: 1,
};

const game = createModel({
  state: initialState,

  reducers: {

  },
});

const models = {
  game,
};



// 2️⃣ 创建 Store
const store = createStore(models);

export default store;