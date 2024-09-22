import { createStore, createModel } from '@ice/store';


interface Card {
  suit: string;
  back: boolean;
}

interface Model {
  fills: [Card[], Card[], Card[], Card[]],
  size: 'big'| 'small',
  decks: Card[][],
  stacks: string[],
  stacks_current: string;
  orientation: 1|0;
  fillContainer?: Phaser.GameObjects.Container,
  decksContainer?: Phaser.GameObjects.Container
}


const initialState: Model = {
  fills: [[], [], [], []],
  size: 'small',
  stacks: [],
  stacks_current: '',
  decks: [
    [{ suit: 'f_3', back: true }],
    [
      { suit: 'r_10', back: true },
      { suit: 'r_4', back: true }
    ],
    [
      { suit: 'r_2', back: true },
      { suit: 'b_9', back: true },
      { suit: 'f_J', back: true }
    ],
    [      
      { suit: 'r_7', back: true },
      { suit: 'r_6', back: true },
      { suit: 'b_5', back: true },
      { suit: 's_8', back: true }
    ],
    [
      { suit: 'b_6', back: true },
      { suit: 'b_7', back: true },
      { suit: 's_5', back: true },
      { suit: 'b_A', back: true },
      { suit: 'f_K', back: true }
    ],
    [
      { suit: 'r_Q', back: true },
      { suit: 'r_J', back: true },
      { suit: 's_A', back: true },
      { suit: 'f_8', back: true },
      { suit: 'r_A', back: true },
      { suit: 's_K', back: true }
    ],
    [
      { suit: 's_J', back: true },
      { suit: 'f_7', back: true },
      { suit: 'f_6', back: true },
      { suit: 's_10', back: true },
      { suit: 'b_2', back: true },
      { suit: 'b_K', back: true },
      { suit: 'f_A', back: true }
    ],
  ],
  orientation: 1
};

const generateStacks = (decks: Card[][]) => {
  const suits = ['f', 'r', 'b','s'];
  const numbers = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  let deckCards = decks.flatMap(deck => deck);
  let result = [];
  for (let suit of suits) {
    for (let number of numbers) {
      let id = `${suit}_${number}`;
      if (!deckCards.find(card => card.suit == id)) {
        result.push(id);
      }
    }
  }
  return result;
} 

generateStacks(initialState.decks);


const game = createModel({
  state: {...initialState, stacks: generateStacks(initialState.decks)},

  reducers: {
    update: (state, payload) => {
      return {...state,...payload };
    },
    fill (state, payload) {
      const { index, card} = payload;
      state.fills[index].push(card);
      // 删除decks里的card
      const deckIndex = state.decks.findIndex(deck => deck.some(c => c.suit === card.suit));
      state.decks[deckIndex] = state.decks[deckIndex]?.filter(c => c.suit!== card.suit);
      state.decks.forEach(deck => {
        if (deck.length > 0) {
          deck[deck.length - 1].back = false;
        }
      });
      return state;
    },
    snap: (state, payload) => {
      let cards: Card[] = [];
      const {target_card, card} = payload;
      for (let i = 0; i < state.decks.length; i++) {
        for (let j = 0; j < state.decks[i].length; j++) {
          if (state.decks[i][j].suit === card.suit) {
            // 删除j后面的元素
            cards = state.decks[i].splice(j, state.decks[i].length - j);
            cards.shift();
            break;
          } 
        }
      }
      for (let i = 0; i < state.decks.length; i++) {
        for (let j = 0; j < state.decks[i].length; j++) {
          if (state.decks[i][j].suit === target_card.suit) {
            if (j === state.decks[i].length - 1) {
              state.decks[i].push({
                suit: card.suit,
                back: false
              });
              state.stacks_current = '';
              cards.forEach(card => {
                state.decks[i].push(card);
              })
            }
          } 
        }
      }
      return state;
    }
  },
});

const models = {
  game,
};



// 2️⃣ 创建 Store
const store = createStore(models);

export default store;