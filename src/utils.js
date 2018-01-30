
import update from 'immutability-helper';

function bisect (a, x) {
    let lo = 0, hi = a.length, mid;
    while (lo < hi) {
        mid = (lo + hi) / 2 | 0;
        if (x < a[mid]) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

export function changeSelection (values, value, selected) {
    const index = bisect(values, value);
    if (selected) {
        return values[index - 1] === value ? {} : {$splice: [[index, 0, value]]};
    } else {
        return values[index - 1] !== value ? {} : {$splice: [[index - 1, 1]]};
    }
}

export function sortedArrayHasElement (a, x) {
  const i = bisect(a, x) - 1;
  return a[i] === x;
}


export function updateGridGeometry (grid) {
  const {width, height, cellWidth, cellHeight, scrollTop, nbCells} = grid;
  const scrollBarWidth = 20;
  const pageColumns = Math.max(40, Math.floor((width - scrollBarWidth) / cellWidth));
  const pageRows = Math.max(8, Math.ceil(height / cellHeight));
  const bottom = Math.ceil(nbCells / pageColumns) * cellHeight - 1;
  const maxTop = Math.max(0, bottom + 1 - pageRows * cellHeight);
  return {...grid, pageColumns, pageRows, scrollTop: Math.min(maxTop, scrollTop), bottom, maxTop};
}

export function updateGridVisibleRows (grid, options) {
  options = options || {};
  const {nbCells, cellHeight, pageColumns, pageRows, cells, scrollTop, selectedRows} = grid;
  if (typeof scrollTop !== 'number') {
    return grid;
  }
  const firstRow = Math.floor(scrollTop / cellHeight);
  const lastRow = Math.min(firstRow + pageRows - 1, Math.ceil(nbCells / pageColumns) - 1);
  const rows = [];
  const getCell = options.getCell || (cells ? (index => ({cell: cells[index]})) : (_index => null));
  for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
    const rowStartPos = rowIndex * pageColumns;
    const rowCells = [];
    for (let colIndex = 0; colIndex < pageColumns; colIndex += 1) {
      rowCells.push({index: colIndex, ...getCell(rowStartPos + colIndex)});
    }
    const selected = selectedRows && sortedArrayHasElement(selectedRows, rowIndex);
    rows.push({index: rowIndex, selected, columns: rowCells});
  }
  return {...grid, visible: {rows}};
}

export function updateGridVisibleColumns (grid, options) {
  options = options || {};
  const {cellHeight, pageColumns, pageRows, cells, scrollTop, selectedColumns} = grid;
  if (typeof scrollTop !== 'number') {
    return grid;
  }
  const firstRow = Math.floor(scrollTop / cellHeight);
  const lastRow = firstRow + pageRows - 1;
  const columns = [];
  const getCell = options.getCell || (cells ? (index => ({cell: cells[index]})) : (_index => null));
  for (let colIndex = 0; colIndex < pageColumns; colIndex += 1) {
    const colCells = [];
    for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
      colCells.push({index: rowIndex, ...getCell(rowIndex * pageColumns + colIndex)});
    }
    const selected = selectedColumns && sortedArrayHasElement(selectedColumns, colIndex);
    columns.push({index: colIndex, selected, rows: colCells});
  }
  return {...grid, visible: {columns}};
}

export function updateGridVisibleArea (grid, options) {
  /* TODO: build a cache key, store it in the grid, use it to skip computation when unchanged */
  if (grid.mode === 'rows') {
    return updateGridVisibleRows(grid, options);
  }
  if (grid.mode === 'columns') {
    return updateGridVisibleColumns(grid, options);
  }
  return grid;
}

/* ROTOR functions */


export function makeRotor (alphabet, {schedule, editableRow}) {
  const size = alphabet.length;
  const cells = alphabet.split('') .map(function (c, rank) {
    return {rank, rotating: c, editable: null, locked: false, conflict: false};
  });
  const nullPerm = new Array(size).fill(-1);
  return {alphabet, size, schedule, editableRow, cells, forward: nullPerm, backward: nullPerm};
}

export function dumpRotors (alphabet, rotors) {
  return rotors.map(rotor =>
    rotor.cells.map(({editable, locked}) =>
      [alphabet.indexOf(editable), locked ? 1 : 0]));
}

export function loadRotors (alphabet, rotorSpecs, rotorDumps) {
  return rotorDumps.map((cells, rotorIndex) => {
    const $cells = [];
    cells.forEach((cell, cellIndex) => {
      /* Locking information is not included in the answer. */
      if (typeof cell === 'number') cell = [cell, 0];
      const [rank, locked] = cell;
      $cells[cellIndex] = {
        editable: {$set: rank === -1 ? null : alphabet[rank]},
        locked: {$set: locked !== 0},
      };
    });
    let rotor = makeRotor(alphabet, rotorSpecs[rotorIndex]);
    rotor = update(rotor, {cells: $cells});
    rotor = markRotorConflicts(updatePerms(rotor));
    return rotor;
  });
}

export function editRotorCell (rotor, rank, symbol) {
  rotor = update(rotor, {cells: {[rank]: {editable: {$set: symbol}}}});
  return updatePerms(markRotorConflicts(rotor));
}

export function lockRotorCell (rotor, rank, locked) {
  return update(rotor, {cells: {[rank]: {locked: {$set: locked}}}});
}

function markRotorConflicts (rotor) {
  const counts = new Map();
  const changes = {};
  for (let {rank, editable, conflict} of rotor.cells) {
    if (conflict) {
      changes[rank] = {conflict: {$set: false}};
    }
    if (editable !== null) {
      if (!counts.has(editable)) {
        counts.set(editable, [rank]);
      } else {
        counts.get(editable).push(rank);
      }
    }
  }
  for (let ranks of counts.values()) {
    if (ranks.length > 1) {
      for (let rank of ranks) {
        changes[rank] = {conflict: {$set: true}};
      }
    }
  }
  return update(rotor, {cells: changes});
}

export function updateRotorWithKey (alphabet, rotor, key) {
  const $cells = {};
  key.split('').forEach((symbol, cellIndex) => {
    $cells[cellIndex] = {
      editable: {$set: alphabet.indexOf(symbol) === -1 ? null : symbol}
    };
  });
  return updatePerms(update(rotor, {cells: $cells}));
}

export function updatePerms (rotor) {
  const {size, alphabet, cells} = rotor;
  const forward = new Array(size).fill(-1);
  const backward = new Array(size).fill(-1);
  for (let cell of cells) {
    if (cell.editable !== null && !cell.conflict) {
      const source = alphabet.indexOf(cell.editable);
      forward[source] = cell.rank;
      backward[cell.rank] = source;
    }
  }
  return {...rotor, forward, backward};
}

export function getRotorShift (rotor, position) {
  const {size, schedule} = rotor;
  return schedule === 0 ? 0 : Math.floor(position / schedule) % size;
}

export function applyRotors (rotors, position, rank) {
  const result = {rank, locks: 0};
  for (let rotorIndex = 0; rotorIndex < rotors.length; rotorIndex += 1) {
    applyRotor(rotors[rotorIndex], position, result);
    if (result.rank === -1) {
      break;
    }
  }
  return result;
}

function applyRotor (rotor, position, result) {
  const shift = getRotorShift(rotor, position);
  let rank = result.rank, cell;
  /* Negative shift to the static top row before permutation. */
  if (rotor.editableRow === 'bottom') {
    rank = applyShift(rotor.size, -shift, rank);
    cell = rotor.cells[rank];
  }
  /* Apply the permutation. */
  rank = rotor.forward[rank];
  /* Positive shift to the static bottom row after permutation. */
  if (rotor.editableRow === 'top') {
    cell = rotor.cells[rank];
    rank = applyShift(rotor.size, shift, rank);
  }
  /* Save new rank (can be -1) and attributes. */
  result.rank = rank;
  if (cell) {
    if (cell.locked) {
      result.locks += 1;
    }
    if (cell.collision) {
      result.collision = true;
    }
  }
}

function applyShift (mod, amount, rank) {
  if (rank !== -1) {
    if (amount < 0) {
      amount += mod;
    }
    rank = (rank + amount) % mod;
  }
  return rank;
}

export function wrapAround (value, mod) {
  return ((value % mod) + mod) % mod;
}
