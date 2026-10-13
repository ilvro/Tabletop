/**
 * Room recipes as data. Each item names a catalogue model (without the
 * `builtin-` prefix) and a placement rule the layout solver understands:
 *
 *   wall    against a wall, back to it     prefer: long|short|far|door|window|opposite|same (+ of)
 *   corner  tucked into a corner
 *   center  in the middle                  dx/dz: -1…1 of the half room, rotation
 *   front / behind  facing another item    of, gap, face: toward|away|same
 *   beside  flush next to another item     of, side
 *   around  seats around a table           of
 *   ring    in a circle around an item     of
 *   on      on top of furniture            of, u/v: -1…1 across the top
 *   under   flat on the floor below        of
 *   grid    rows with an aisle             columns, aisle, rotation
 *   free    anywhere there is room
 *
 * `level` is the density that first includes the item (0 few, 1 normal, 2 more);
 * `count` is a number, `[few, normal, more]` or 'chairs' (the user's setting);
 * `lift` hangs a flat piece on the wall at that height; `flat` lies on the floor
 * without taking space. Items with a count are named `slot.1`, `slot.2`…
 */
const wall = (slot, asset, rule = {}) => ({ slot, asset, at: 'wall', ...rule });
const corner = (slot, asset, rule = {}) => ({ slot, asset, at: 'corner', ...rule });
const on = (slot, asset, of, rule = {}) => ({ slot, asset, at: 'on', of, ...rule });
const item = (slot, asset, at, rule = {}) => ({ slot, asset, at, ...rule });

export const ROOM_GROUPS = ['Trabalho', 'Casa', 'Delegacia', 'Saúde e ciência', 'Comércio e lazer', 'Indústria', 'Religioso e paranormal', 'Medieval'];
export const ROOM_RECIPES = [
  { id: 'office', name: 'Escritório', group: 'Trabalho', items: [
    item('desk.main', 'desk', 'center', { dx: -.25, dz: -.1, rotation: 0 }), item('desk.chair', 'chair', 'front', { of: 'desk.main', gap: .05 }),
    on('desk.computer', 'computer', 'desk.main', { u: -.6, turn: 180 }), on('desk.phone', 'telephone', 'desk.main', { u: .8, level: 1 }),
    wall('cabinet.main', 'cabinet', { prefer: 'far', level: 1 }), corner('lamp.corner', 'lamp', { level: 1 }), wall('bookshelf.main', 'bookshelf', { prefer: 'long', level: 1 }),
    item('desk.visitor', 'chair', 'behind', { of: 'desk.main', gap: .35, level: 2 }), corner('plant.corner', 'house-plant', { level: 2 }),
    item('cabinet.extra', 'cabinet', 'beside', { of: 'cabinet.main', level: 2 }), corner('crate.corner', 'crate', { level: 2 }), on('desk.documents', 'documents', 'desk.main', { u: .1, v: -.5, level: 2 }),
  ] },
  { id: 'meeting', name: 'Sala de reunião', group: 'Trabalho', seats: true, items: [
    item('table.main', 'dining-table', 'center'), item('table.chair', 'chair', 'around', { of: 'table.main', count: 'chairs' }),
    wall('cabinet.main', 'cabinet', { prefer: 'short', level: 1 }), on('table.documents', 'documents', 'table.main', { u: -.3, level: 1 }),
    wall('board.main', 'evidence-board', { prefer: 'short', lift: 1.1, level: 1 }), corner('plant.corner', 'house-plant', { level: 2 }), on('table.projector', 'projector', 'table.main', { u: .6, level: 2 }),
  ] },
  { id: 'investigation', name: 'Sala de investigação', group: 'Trabalho', items: [
    wall('desk.main', 'desk', { prefer: 'long' }), item('desk.chair', 'chair', 'front', { of: 'desk.main', gap: .05 }), on('desk.typewriter', 'typewriter', 'desk.main', { u: -.5, turn: 180 }),
    wall('board.main', 'evidence-board', { prefer: 'opposite', of: 'desk.main', lift: 1.1 }), on('desk.documents', 'documents', 'desk.main', { u: .6 }),
    wall('cabinet.main', 'cabinet', { prefer: 'far', level: 1 }), corner('safe.corner', 'safe', { level: 1 }), on('desk.radio', 'radio', 'desk.main', { u: .1, v: -.6, level: 1 }),
    item('table.main', 'coffee-table', 'center', { level: 1 }), on('table.case', 'evidence-case', 'table.main', { level: 1 }), corner('coat.corner', 'coat-rack', { level: 2 }),
    wall('catalog.main', 'card-catalog', { level: 2 }), corner('tripod.corner', 'camera-tripod', { level: 2 }), wall('weapon.case', 'weapon-case', { level: 2 }),
  ] },
  { id: 'living', name: 'Sala de estar', group: 'Casa', items: [
    wall('sofa.main', 'sofa', { prefer: 'long' }), item('table.coffee', 'coffee-table', 'front', { of: 'sofa.main', gap: .45, face: 'same' }), item('rug.main', 'rug', 'under', { of: 'table.coffee', flat: true }),
    wall('tv.stand', 'dresser', { prefer: 'opposite', of: 'sofa.main' }), on('tv.set', 'crt-tv', 'tv.stand'),
    item('armchair.main', 'armchair', 'beside', { of: 'sofa.main', gap: .3, level: 1 }), wall('bookshelf.main', 'bookshelf', { level: 1 }), corner('lamp.corner', 'lamp', { level: 1 }), corner('plant.corner', 'house-plant', { level: 1 }),
    on('table.documents', 'documents', 'table.coffee', { level: 2 }), wall('clock.main', 'grandfather-clock', { level: 2 }), wall('fireplace.main', 'fireplace', { prefer: 'short', level: 2 }), wall('radio.table', 'bedside-table', { level: 2 }), on('radio.set', 'gramophone', 'radio.table', { level: 2 }),
  ] },
  { id: 'kitchen', name: 'Cozinha', group: 'Casa', seats: true, items: [
    wall('sink.main', 'sink', { prefer: 'far' }), item('stove.main', 'stove', 'beside', { of: 'sink.main' }), item('counter.main', 'house-counter', 'beside', { of: 'sink.main' }),
    wall('fridge.main', 'fridge', { prefer: 'same', of: 'sink.main', align: 'start' }), item('table.main', 'dining-table', 'center', { dz: .35, level: 1 }), item('table.chair', 'chair', 'around', { of: 'table.main', count: 'chairs', level: 1 }),
    on('table.setting', 'house-place-setting', 'table.main', { u: -.5, level: 1 }), corner('trash.corner', 'trash-can', { level: 1 }), wall('washer.main', 'house-washer', { level: 2 }), wall('cabinet.main', 'cabinet', { level: 2 }), on('counter.radio', 'radio', 'counter.main', { level: 2 }),
  ] },
  { id: 'dining', name: 'Sala de jantar', group: 'Casa', seats: true, items: [
    item('table.main', 'dining-table', 'center'), item('table.chair', 'chair', 'around', { of: 'table.main', count: 'chairs' }), item('rug.main', 'rug', 'under', { of: 'table.main', flat: true, level: 1 }),
    on('table.setting.1', 'house-place-setting', 'table.main', { u: -.6, v: .5 }), on('table.setting.2', 'house-place-setting', 'table.main', { u: .6, v: -.5, turn: 180 }),
    wall('dresser.main', 'dresser', { prefer: 'long', level: 1 }), corner('plant.corner', 'house-plant', { level: 1 }), wall('clock.main', 'grandfather-clock', { level: 2 }), wall('cabinet.main', 'cabinet', { level: 2 }), on('dresser.candles', 'candles', 'dresser.main', { level: 2 }),
  ] },
  { id: 'bedroom', name: 'Quarto', group: 'Casa', items: [
    wall('bed.main', 'single-bed', { prefer: 'far' }), item('bedside.main', 'bedside-table', 'beside', { of: 'bed.main' }), on('bedside.lantern', 'kerosene-lantern', 'bedside.main'),
    wall('wardrobe.main', 'wardrobe', { prefer: 'long' }), wall('dresser.main', 'dresser', { level: 1 }), wall('mirror.main', 'mirror', { prefer: 'same', of: 'dresser.main', lift: .95, level: 1 }), corner('coat.corner', 'coat-rack', { level: 1 }),
    wall('desk.main', 'desk', { prefer: 'window', level: 2 }), item('desk.chair', 'chair', 'front', { of: 'desk.main', gap: .05, level: 2 }), corner('chair.rocking', 'rocking-chair', { level: 2 }), on('dresser.radio', 'radio', 'dresser.main', { level: 2 }),
  ] },
  { id: 'bathroom', name: 'Banheiro', group: 'Casa', items: [
    wall('toilet.main', 'toilet', { prefer: 'far' }), wall('sink.main', 'sink', { prefer: 'door' }), wall('mirror.main', 'mirror', { prefer: 'same', of: 'sink.main', lift: 1.15 }),
    corner('shower.main', 'shower'), wall('bathtub.main', 'bathtub', { prefer: 'long', turn: 90, level: 1 }), corner('trash.corner', 'trash-can', { level: 1 }), wall('cabinet.main', 'cabinet', { level: 2 }), wall('washer.main', 'house-washer', { level: 2 }),
  ] },
  { id: 'garage', name: 'Garagem', group: 'Casa', items: [
    item('car.main', 'sedan', 'center', { dx: .15, dz: -.3, rotation: 0 }), wall('bench.main', 'workbench', { prefer: 'short' }), item('tools.main', 'tool-chest', 'beside', { of: 'bench.main' }),
    wall('bike.main', 'bicycle', { turn: 90, level: 1 }), corner('barrel.corner', 'barrel', { level: 1 }), wall('locker.main', 'locker', { level: 1 }), item('crate', 'crate', 'free', { count: [0, 1, 3] }),
    wall('moto.main', 'motorcycle', { turn: 90, level: 2 }), corner('tank.corner', 'oxygen-tank', { level: 2 }), wall('panel.main', 'power-panel', { lift: 1.2, level: 2 }),
  ] },
  { id: 'reception', name: 'Recepção', group: 'Delegacia', items: [
    item('counter.main', 'reception-counter', 'center', { dz: -.35, rotation: 0 }), item('counter.chair', 'chair', 'behind', { of: 'counter.main', gap: .25 }), on('counter.computer', 'computer', 'counter.main', { u: -.5 }), on('counter.phone', 'telephone', 'counter.main', { u: .6 }),
    wall('bench', 'bench', { prefer: 'door', count: [1, 2, 3] }), corner('plant.corner', 'house-plant', { level: 1 }), wall('vending.main', 'vending-machine', { level: 1 }), corner('trash.corner', 'trash-can', { level: 1 }),
    wall('cabinet.main', 'cabinet', { prefer: 'far', level: 1 }), corner('coat.corner', 'coat-rack', { level: 2 }), wall('locker.main', 'locker', { prefer: 'far', level: 2 }), on('counter.documents', 'documents', 'counter.main', { level: 2 }),
  ] },
  { id: 'interrogation', name: 'Sala de interrogatório', group: 'Delegacia', items: [
    item('table.main', 'desk', 'center'), item('chair.suspect', 'chair', 'front', { of: 'table.main', gap: .05 }), item('chair.detective', 'chair', 'behind', { of: 'table.main', gap: .05 }),
    on('table.recorder', 'reel-recorder', 'table.main', { u: -.6 }), on('table.documents', 'documents', 'table.main', { u: .5, level: 1 }), corner('tripod.corner', 'camera-tripod', { level: 1 }), corner('lamp.corner', 'lamp', { level: 1 }),
    wall('mirror.main', 'mirror', { prefer: 'long', lift: 1.1, level: 1 }), item('chair.extra', 'chair', 'beside', { of: 'chair.detective', gap: .2, level: 2 }), wall('cabinet.main', 'cabinet', { level: 2 }),
  ] },
  { id: 'cell', name: 'Cela', group: 'Delegacia', items: [
    wall('bed.main', 'single-bed', { prefer: 'long', turn: 90 }), corner('toilet.main', 'toilet'), wall('bench.main', 'bench', { level: 1 }), wall('sink.main', 'sink', { prefer: 'short', level: 2 }), wall('bed.extra', 'bunk-bed', { turn: 90, level: 2 }),
  ] },
  { id: 'archive', name: 'Arquivo', group: 'Delegacia', items: [
    wall('catalog', 'card-catalog', { prefer: 'long', count: [2, 3, 5] }), wall('cabinet', 'cabinet', { count: [1, 3, 5] }), wall('shelf', 'bookshelf', { count: [1, 2, 3] }),
    item('desk.main', 'desk', 'center'), item('desk.chair', 'chair', 'front', { of: 'desk.main', gap: .05 }), on('desk.documents', 'documents', 'desk.main', { u: -.5 }), on('desk.typewriter', 'typewriter', 'desk.main', { u: .5, turn: 180, level: 1 }),
    corner('safe.corner', 'safe', { level: 1 }), item('crate', 'old-closed-crate', 'free', { count: [0, 1, 2] }), corner('lamp.corner', 'lamp', { level: 2 }),
  ] },
  { id: 'ward', name: 'Enfermaria', group: 'Saúde e ciência', items: [
    wall('gurney', 'gurney', { prefer: 'long', count: [2, 3, 4], gap: .06 }), item('iv.main', 'iv-stand', 'beside', { of: 'gurney.1', gap: .1 }), item('cart.main', 'medical-cart', 'beside', { of: 'gurney.2', gap: .1 }),
    wall('cabinet.main', 'cabinet', { prefer: 'short', level: 1 }), corner('wheelchair.corner', 'wheelchair', { level: 1 }), item('screen', 'privacy-screen', 'free', { count: [0, 1, 2], rotation: 90 }),
    corner('oxygen.corner', 'oxygen-tank', { level: 1 }), wall('sink.main', 'sink', { prefer: 'door', level: 2 }), item('iv.extra', 'iv-stand', 'beside', { of: 'gurney.3', gap: .1, level: 2 }), corner('trash.corner', 'trash-can', { level: 2 }),
  ] },
  { id: 'clinic', name: 'Consultório', group: 'Saúde e ciência', items: [
    wall('desk.main', 'desk', { prefer: 'door' }), item('desk.chair', 'chair', 'front', { of: 'desk.main', gap: .05 }), on('desk.computer', 'computer', 'desk.main', { u: -.5, turn: 180 }),
    wall('gurney.main', 'gurney', { prefer: 'far' }), item('cart.main', 'medical-cart', 'beside', { of: 'gurney.main', gap: .1 }), wall('cabinet.main', 'cabinet', { level: 1 }),
    item('screen.main', 'privacy-screen', 'front', { of: 'gurney.main', gap: .5, face: 'same', level: 1 }), corner('plant.corner', 'house-plant', { level: 1 }), on('cart.microscope', 'microscope', 'cart.main', { level: 2 }), corner('iv.corner', 'iv-stand', { level: 2 }), wall('sink.main', 'sink', { level: 2 }),
  ] },
  { id: 'morgue', name: 'Necrotério', group: 'Saúde e ciência', items: [
    item('table.main', 'autopsy-table', 'center', { rotation: 0 }), wall('drawers', 'mortuary-cabinet', { prefer: 'long', count: [1, 1, 2] }), item('lamp.main', 'surgical-lamp', 'beside', { of: 'table.main', gap: .15 }),
    item('cart.main', 'medical-cart', 'beside', { of: 'table.main', gap: .25, side: -1 }), on('cart.jars', 'specimen-jars', 'cart.main'), wall('sink.main', 'sink', { prefer: 'short', level: 1 }),
    wall('gurney.main', 'gurney', { level: 1 }), on('gurney.bag', 'body-bag', 'gurney.main', { turn: 0, level: 1 }), corner('trash.corner', 'trash-can', { level: 1 }), wall('cabinet.main', 'cabinet', { level: 2 }), on('table.bag', 'body-bag', 'table.main', { turn: 0, level: 2 }),
  ] },
  { id: 'lab', name: 'Laboratório', group: 'Saúde e ciência', items: [
    wall('bench', 'workbench', { prefer: 'long', count: [1, 2, 3] }), on('bench.microscope', 'microscope', 'bench.1', { u: -.6, turn: 180 }), on('bench.rack', 'chemical-rack', 'bench.1', { u: .5, turn: 180 }),
    on('bench.centrifuge', 'centrifuge', 'bench.2', { u: -.5 }), on('bench.scope', 'oscilloscope', 'bench.2', { u: .5, turn: 180 }), on('bench.jars', 'specimen-jars', 'bench.3', { turn: 180 }),
    item('desk.main', 'desk', 'center', { level: 1 }), item('desk.chair', 'chair', 'front', { of: 'desk.main', gap: .05, level: 1 }), on('desk.computer', 'computer', 'desk.main', { u: -.5, turn: 180, level: 1 }),
    wall('cabinet.main', 'cabinet', { level: 1 }), corner('oxygen.corner', 'oxygen-tank', { level: 1 }), wall('server.main', 'server-rack', { level: 2 }), corner('pod.corner', 'containment-pod', { level: 2 }),
  ] },
  { id: 'library', name: 'Biblioteca', group: 'Comércio e lazer', seats: true, items: [
    wall('shelf', 'bookshelf', { prefer: 'long', count: [3, 5, 8] }), item('table.main', 'dining-table', 'center'), item('table.chair', 'chair', 'around', { of: 'table.main', count: 'chairs' }),
    on('table.globe', 'globe', 'table.main', { u: .6 }), wall('catalog.main', 'card-catalog', { prefer: 'door', level: 1 }), corner('armchair.corner', 'armchair', { level: 1 }), corner('lamp.corner', 'lamp', { level: 1 }),
    item('rug.main', 'rug', 'under', { of: 'table.main', flat: true, level: 1 }), on('table.documents', 'documents', 'table.main', { u: -.5, level: 2 }), wall('clock.main', 'grandfather-clock', { level: 2 }),
  ] },
  { id: 'bar', name: 'Bar', group: 'Comércio e lazer', items: [
    wall('counter.main', 'reception-counter', { prefer: 'long', gap: .9, turn: 180 }), item('stool', 'bar-stool', 'behind', { of: 'counter.main', gap: .15, count: [2, 3, 4] }), on('counter.register', 'cash-register', 'counter.main', { u: .8 }),
    wall('shelf.main', 'supermarket-shelf', { prefer: 'same', of: 'counter.main' }), wall('booth', 'restaurant-booth', { prefer: 'opposite', of: 'counter.main', count: [1, 2, 3] }), on('counter.radio', 'radio', 'counter.main', { u: -.7, level: 1 }),
    item('pool.main', 'pool-table', 'center', { dz: .3, level: 1 }), wall('arcade.main', 'arcade-cabinet', { level: 1 }), wall('vending.main', 'vending-machine', { level: 2 }), corner('trash.corner', 'trash-can', { level: 2 }), corner('gramophone.table', 'bedside-table', { level: 2 }), on('gramophone.set', 'gramophone', 'gramophone.table', { level: 2 }),
  ] },
  { id: 'classroom', name: 'Sala de aula', group: 'Comércio e lazer', items: [
    item('student', 'classroom-desk', 'grid', { count: [6, 9, 12], dz: -.3, spacingX: .55, spacingZ: .4, rotation: 180 }), item('teacher.desk', 'desk', 'center', { dz: -.75, rotation: 0 }),
    item('teacher.chair', 'chair', 'behind', { of: 'teacher.desk', gap: .05 }), on('teacher.globe', 'globe', 'teacher.desk', { u: .7 }), wall('board.main', 'chalkboard', { prefer: 'same', of: 'teacher.desk', lift: 1.05 }),
    wall('shelf.main', 'bookshelf', { prefer: 'long', level: 1 }), wall('locker.main', 'locker', { level: 1 }), corner('trash.corner', 'trash-can', { level: 1 }), on('teacher.documents', 'documents', 'teacher.desk', { u: -.5, level: 2 }), wall('cabinet.main', 'cabinet', { level: 2 }),
  ] },
  { id: 'shop', name: 'Mercado', group: 'Comércio e lazer', items: [
    item('aisle', 'supermarket-shelf', 'grid', { count: [3, 6, 9], dz: -.3, spacingX: .9, spacingZ: 1.1, rotation: 90, columns: 3 }), wall('counter.main', 'reception-counter', { prefer: 'door', gap: .8, turn: 180 }),
    on('counter.register', 'cash-register', 'counter.main', { u: .6 }), wall('fridge', 'fridge', { prefer: 'far', count: [1, 2, 3] }), item('cart', 'shopping-cart', 'free', { count: [1, 2, 3] }),
    wall('vending.main', 'vending-machine', { level: 1 }), wall('display.main', 'display-case', { level: 1 }), corner('trash.corner', 'trash-can', { level: 2 }),
  ] },
  { id: 'storage', name: 'Depósito', group: 'Indústria', items: [
    wall('cabinet.main', 'locker', { prefer: 'short' }), wall('shelf', 'supermarket-shelf', { prefer: 'long', count: [1, 2, 4] }), item('crate', 'crate', 'grid', { count: [4, 8, 16], dz: -.5, spacingX: .24, spacingZ: .24, jitter: 6, rotation: 0 }),
    item('pallet', 'pallet', 'free', { count: [1, 2, 3], flat: false }), corner('barrel', 'barrel', { count: [0, 1, 2] }), item('jack.main', 'pallet-jack', 'free', { level: 2 }), item('crate.old', 'old-closed-crate', 'free', { level: 2 }),
  ] },
  { id: 'workshop', name: 'Oficina', group: 'Indústria', items: [
    wall('bench', 'workbench', { prefer: 'long', count: [1, 2, 2] }), item('tools.main', 'tool-chest', 'beside', { of: 'bench.1' }), corner('generator.corner', 'generator'),
    wall('locker.main', 'locker', { level: 1 }), corner('barrel.corner', 'barrel', { level: 1 }), wall('panel.main', 'power-panel', { lift: 1.2, level: 1 }), item('crate', 'crate', 'free', { count: [1, 2, 4] }),
    item('pallet.main', 'pallet', 'free', { level: 1 }), corner('tank.corner', 'water-tank', { level: 2 }), wall('valve.main', 'pipe-valve', { level: 2 }), item('jack.main', 'pallet-jack', 'free', { level: 2 }),
  ] },
  { id: 'surveillance', name: 'Sala de monitoramento', group: 'Indústria', items: [
    wall('monitor.main', 'surveillance-monitor', { prefer: 'long' }), item('monitor.chair', 'chair', 'front', { of: 'monitor.main', gap: .15 }), wall('server', 'server-rack', { prefer: 'far', count: [1, 2, 3] }),
    wall('desk.main', 'desk', { level: 1 }), on('desk.recorder', 'vhs-recorder', 'desk.main', { u: -.5, turn: 180, level: 1 }), on('desk.radio', 'radio', 'desk.main', { u: .5, turn: 180, level: 1 }),
    item('desk.chair', 'chair', 'front', { of: 'desk.main', gap: .05, level: 1 }), wall('cabinet.main', 'cabinet', { level: 1 }), wall('panel.main', 'power-panel', { lift: 1.2, level: 2 }), on('desk.phone', 'telephone', 'desk.main', { level: 2 }),
  ] },
  { id: 'chapel', name: 'Capela', group: 'Religioso e paranormal', items: [
    item('pew', 'church-pew', 'grid', { count: [4, 6, 10], columns: 2, aisle: 1.7, spacingX: .2, spacingZ: .6, dz: -.2, rotation: 180 }), item('lectern.main', 'lectern', 'center', { dz: -.7, rotation: 0 }),
    item('candelabra.left', 'church-candelabra', 'beside', { of: 'lectern.main', gap: .9, side: 1 }), item('candelabra.right', 'church-candelabra', 'beside', { of: 'lectern.main', gap: .9, side: -1, level: 1 }),
    wall('confessional.main', 'confessional', { prefer: 'long', level: 1 }), corner('statue.corner', 'angel-statue', { level: 1 }), wall('bench.main', 'bench', { prefer: 'door', level: 2 }), wall('banner.main', 'church-ritual-banner', { prefer: 'same', of: 'lectern.main', level: 2 }),
  ] },
  { id: 'ritual', name: 'Sala de ritual', group: 'Religioso e paranormal', items: [
    item('circle.main', 'ritual-circle', 'center', { flat: true }), item('candle', 'candles', 'ring', { of: 'circle.main', count: [3, 5, 8] }), wall('altar.main', 'ritual-altar', { prefer: 'far' }),
    on('altar.book', 'ritual-book', 'altar.main', { u: -.5 }), on('altar.skull', 'skull-display', 'altar.main', { u: .6, turn: 0 }), corner('candelabra', 'ritual-candelabra', { count: [1, 2, 4] }),
    wall('effigy.main', 'effigy', { level: 1 }), item('blood.main', 'blood-pool', 'free', { flat: true, level: 1 }), on('altar.crystal', 'crystal', 'altar.main', { u: 0, v: -.6, level: 1 }),
    corner('obelisk.corner', 'obelisk', { level: 2 }), item('cage.main', 'cage', 'free', { level: 2 }), on('altar.mask', 'ritual-mask', 'altar.main', { u: .1, v: .6, level: 2 }),
  ] },
  { id: 'tavern', name: 'Taverna', group: 'Medieval', items: [
    item('table.main', 'medieval-trestle-table', 'center', { dz: .15 }), item('bench.front', 'medieval-bench', 'front', { of: 'table.main', gap: .12, face: 'same' }), item('bench.back', 'medieval-bench', 'behind', { of: 'table.main', gap: .12, face: 'same' }),
    on('table.tankards', 'medieval-tankards', 'table.main', { u: -.4 }), wall('hearth.main', 'medieval-hearth', { prefer: 'far' }), wall('barrels.main', 'medieval-barrel-rack', { prefer: 'long' }),
    wall('counter.main', 'medieval-trestle-table', { prefer: 'same', of: 'barrels.main', gap: 1.0, level: 1 }), on('counter.tankards', 'medieval-tankards', 'counter.main', { u: .5, level: 1 }), item('stool', 'medieval-stool', 'free', { count: [1, 3, 5] }),
    wall('cupboard.main', 'medieval-cupboard', { level: 1 }), wall('shield.main', 'medieval-shield', { prefer: 'long', lift: 1.2, level: 1 }), wall('torch', 'medieval-wall-torch', { lift: 1.5, count: [1, 2, 3] }),
    item('table.second', 'medieval-trestle-table', 'free', { rotation: 0, level: 2 }), on('second.tankards', 'medieval-tankards', 'table.second', { level: 2 }), corner('sacks.corner', 'medieval-sacks', { level: 2 }), item('cauldron.main', 'medieval-cauldron', 'front', { of: 'hearth.main', gap: .5, face: 'same', level: 2 }),
  ] },
  { id: 'throne', name: 'Sala do trono', group: 'Medieval', items: [
    wall('throne.main', 'medieval-throne', { prefer: 'far' }), item('carpet.main', 'rug', 'front', { of: 'throne.main', gap: .5, face: 'same', flat: true }), item('stand.left', 'medieval-candle-stand', 'beside', { of: 'throne.main', gap: .5, side: 1 }),
    item('stand.right', 'medieval-candle-stand', 'beside', { of: 'throne.main', gap: .5, side: -1 }), wall('banner', 'medieval-banner', { prefer: 'same', of: 'throne.main', lift: .45, count: [1, 2, 2] }),
    wall('bench', 'medieval-bench', { prefer: 'long', count: [1, 2, 4] }), corner('brazier', 'medieval-brazier', { count: [1, 2, 2] }), wall('armor', 'medieval-armor-stand', { count: [0, 2, 2] }),
    wall('shield.main', 'medieval-shield', { prefer: 'long', lift: 1.3, level: 1 }), wall('chest.main', 'medieval-chest', { level: 1 }), wall('torch', 'medieval-wall-torch', { lift: 1.5, count: [0, 2, 4] }), wall('rack.main', 'medieval-weapon-rack', { level: 2 }),
  ] },
  { id: 'forge', name: 'Ferraria', group: 'Medieval', items: [
    wall('forge.main', 'medieval-forge', { prefer: 'far' }), item('anvil.main', 'medieval-anvil', 'front', { of: 'forge.main', gap: .7, face: 'same' }), wall('bench.main', 'medieval-trestle-table', { prefer: 'long' }),
    corner('barrel.corner', 'wooden-expedition-barrel'), wall('rack.main', 'medieval-weapon-rack', { level: 1 }), corner('sacks.corner', 'medieval-sacks', { level: 1 }), item('stool.main', 'medieval-stool', 'front', { of: 'bench.main', gap: .1, level: 1 }),
    wall('chest.main', 'medieval-chest', { level: 1 }), wall('torch', 'medieval-wall-torch', { lift: 1.5, count: [1, 1, 2] }), wall('armor.main', 'medieval-armor-stand', { level: 2 }), item('logs.main', 'log-pile', 'free', { level: 2 }),
  ] },
  { id: 'armory', name: 'Arsenal', group: 'Medieval', items: [
    wall('rack', 'medieval-weapon-rack', { prefer: 'long', count: [1, 2, 4] }), wall('armor', 'medieval-armor-stand', { count: [1, 2, 3] }), wall('chest', 'medieval-chest', { count: [1, 2, 3] }),
    item('table.main', 'medieval-trestle-table', 'center', { level: 1 }), item('table.stool', 'medieval-stool', 'front', { of: 'table.main', gap: .1, level: 1 }), wall('shield', 'medieval-shield', { lift: 1.3, count: [1, 2, 3] }),
    wall('torch', 'medieval-wall-torch', { lift: 1.5, count: [1, 2, 2] }), corner('barrel.corner', 'wooden-expedition-barrel', { level: 1 }), item('dummy.main', 'medieval-training-dummy', 'free', { level: 2 }),
  ] },
];
export const ROOM_TEMPLATE_IDS = ROOM_RECIPES.map(recipe => recipe.id);
export const DENSITY_LEVEL = { sparse: 0, normal: 1, dense: 2 };
