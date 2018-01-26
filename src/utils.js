
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
  const {width, height, cellWidth, cellHeight, scrollTop, cells} = grid;
  const scrollBarWidth = 20;
  const pageColumns = Math.max(40, Math.floor((width - scrollBarWidth) / cellWidth));
  const pageRows = Math.max(8, Math.ceil(height / cellHeight));
  let bottom = 100, maxTop = 0;
  if (cells) {
    bottom = Math.ceil(cells.length / pageColumns) * cellHeight - 1;
    maxTop = Math.max(0, bottom + 1 - pageRows * cellHeight);
  }
  return {...grid, pageColumns, pageRows, scrollTop: Math.min(maxTop, scrollTop), bottom, maxTop};
}

export function updateGridVisibleRows (grid, options) {
  options = options || {};
  const {cellHeight, pageColumns, pageRows, scrollTop, selectedRows} = grid;
  if (typeof scrollTop !== 'number') {
    return grid;
  }
  const firstRow = Math.floor(scrollTop / cellHeight);
  const lastRow = firstRow + pageRows - 1;
  const rows = [];
  const getCell = options.getCell || (grid.cells ? index => ({cell: grid.cells[index]}) : index => null);
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
  const getCell = options.getCell || (grid.cells ? index => ({cell: grid.cells[index]}) : index => null);
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
