/** How a place has been left. A state reshapes what is already in the room; it is not a furniture list. */
export const ROOM_STATES = [
  { id: 'tidy', name: 'Arrumado', description: 'Tira a ambientação, limpa o desgaste aplicado e endireita os móveis.' },
  { id: 'lived', name: 'Habitado', description: 'Objetos de uso sobre os móveis e cadeiras fora de esquadro.' },
  { id: 'abandoned', name: 'Abandonado', description: 'Sujeira em piso, paredes e móveis, peças fora do lugar, entulho e mato nos cantos.' },
  { id: 'crime', name: 'Cena de crime', description: 'Sangue, corpo, marcação e sinais de luta em volta do que já existe.' },
  { id: 'ritual', name: 'Ritual', description: 'Abre o centro afastando os móveis, traça o círculo e usa uma mesa sua como altar.' },
];
export const ROOM_STATE_IDS = ROOM_STATES.map(state => state.id);
