
import React from 'react';
import {connect} from 'react-redux';
import classnames from 'classnames';
import {range} from 'range';
import update from 'immutability-helper';

import {wrapAround, makeRotor, editRotorCell, lockRotorCell, updateRotorWithKey} from './utils';

function appInitReducer (state, _action) {
  return {...state, rotors: [], editing: {}};
}

function rotorCellEditStartedReducer (state, {payload: {rotorIndex, cellRank}}) {
  let {taskData: {alphabet}, rotors} = state;
  rotorIndex = wrapAround(rotorIndex, rotors.length);
  cellRank = wrapAround(cellRank, alphabet.length);
  return update(state, {editing: {$set: {rotorIndex, cellRank}}});
}

function rotorCellEditMovedReducer (state, {payload: {rotorMove, cellMove}}) {
  let {taskData: {alphabet}, rotors, editing: {rotorIndex, cellRank}} = state;
  let rotorStop = rotorIndex, cellStop = cellRank;
  if (rotorIndex === undefined || cellRank === undefined) return state;
  let cell;
  do {
    rotorIndex = wrapAround(rotorIndex + rotorMove, rotors.length);
    cellRank = wrapAround(cellRank + cellMove, alphabet.length);
    cell = rotors[rotorIndex].cells[cellRank];
    /* If we looped back to the starting point, the move is impossible. */
    if (rotorStop == rotorIndex || cellStop == cellRank) return state;
  } while (cell.hint || cell.locked);
  return update(state, {editing: {$set: {rotorIndex, cellRank}}});
}

function rotorCellEditCancelledReducer (state, _action) {
  return update(state, {editing: {$set: {}}});
}

function rotorCellCharChangedReducer (state, {payload: {rotorIndex, rank, symbol}}) {
  let {taskData: {alphabet}, rotors} = state;
  if (symbol.length !== 1 || -1 === alphabet.indexOf(symbol)) {
    symbol = null;
  }
  const rotor = editRotorCell(rotors[rotorIndex], rank, symbol);
  return update(state, {rotors: {[rotorIndex]: {$set: rotor}}});
}

function rotorCellLockChangedReducer (state, {payload: {rotorIndex, rank, isLocked}}) {
  const rotor = lockRotorCell(state.rotors[rotorIndex], rank, isLocked);
  return update(state, {rotors: {[rotorIndex]: {$set: rotor}}});
}

function rotorKeyLoadedReducer (state, {payload: {rotorIndex, key}}) {
  const {taskData: {alphabet}, rotors} = state;
  const rotor = updateRotorWithKey(alphabet, rotors[rotorIndex], key);
  return update(state, {rotors: {[rotorIndex]: {$set: rotor}}});
}

function RotorSelector (state, {index}) {
  const {
    actions: {
      rotorCellLockChanged, rotorCellCharChanged,
      rotorCellEditCancelled, rotorCellEditStarted, rotorCellEditMoved
    },
    rotors, scheduling: {shifts, currentTrace}, editing
  } = state;
  const {editableRow, cells} = rotors[index];
  const shift = shifts[index];
  const activeRank = currentTrace[index] && currentTrace[index].rank;
  const editingRank = editing.rotorIndex === index ? editing.cellRank : null;
  return {
    rotorCellEditStarted, rotorCellEditCancelled, rotorCellEditMoved,
    rotorCellLockChanged, rotorCellCharChanged,
    editableRow, cells, shift, editingRank, activeRank
  };
}

class RotorView extends React.PureComponent {
  render () {
    const {index, editableRow, cells, shift, editingRank, activeRank} = this.props;
    const nbCells = cells.length;
    return (
      <div style={{width: `${20*nbCells}px`}}>
        <div className='clearfix'>
          {range(0, nbCells).map(rank => {
            const {editable, locked, conflict, hint} = cells[rank];
            const isActive = activeRank === rank;
            const isEditing = editingRank === rank && !locked && !hint;
            const isLast = nbCells === rank + 1;
            const shiftedIndex = (rank + shift) % nbCells;
            const {rotating} = cells[shiftedIndex];
            return (
              <RotorCell key={rank} rank={rank} isLast={isLast} editableRow={editableRow}
                staticChar={rotating} editableChar={editable} isLocked={locked} isHint={hint} isEditing={isEditing} isActive={isActive}
                onChangeChar={this.onChangeChar} onChangeLocked={this.onChangeLocked}
                onEditingStarted={this.onEditingStarted} onEditingCancelled={this.onEditingCancelled}
                onEditingMoved={this.editingMoved} isConflict={conflict} />);
          })}
        </div>
      </div>
    );
  }
  onEditingStarted = (rank) => {
    this.props.dispatch({type: this.props.rotorCellEditStarted, payload: {rotorIndex: this.props.index, cellRank: rank}});
  };
  onEditingCancelled = () => {
    this.props.dispatch({type: this.props.rotorCellEditCancelled});
  };
  onChangeChar = (rank, symbol) => {
    symbol = symbol.toUpperCase();
    this.props.dispatch({type: this.props.rotorCellCharChanged, payload: {rotorIndex: this.props.index, rank, symbol}});
  };
  onChangeLocked = (rank, isLocked) => {
    this.props.dispatch({type: this.props.rotorCellLockChanged, payload: {rotorIndex: this.props.index, rank, isLocked}});
  };
  editingMoved = (rotorMove, cellMove) => {
    this.props.dispatch({type: this.props.rotorCellEditMoved, payload: {rotorMove, cellMove}});
  };
}

class RotorCell extends React.PureComponent {
  /* XXX Clicking in the editable div and entering the same letter does not
         trigger a change event.  This behavior is unfortunate. */
  render () {
    const {staticChar, editableChar, isLocked, isHint, isActive, isEditing, editableRow, isLast, isConflict} = this.props;
    const columnStyle = {
      float: 'left',
      width: '20px',
    };
    const staticCellStyle = {
      border: '1px solid black',
      borderRightWidth: isLast ? '1px' : '0',
      textAlign: 'center',
    };
    const editableCellStyle = {
      border: '1px solid black',
      borderRightWidth: isLast ? '1px' : '0',
      textAlign: 'center',
      cursor: 'text',
      backgroundColor: isHint ? '#afa' : (isConflict ? '#fcc' : '#fff')
    };
    /* Apply active-status separation border style. */
    const bottomCellStyle = editableRow === 'top' ? staticCellStyle : editableCellStyle;
    if (isActive) {
      bottomCellStyle.marginTop = '0';
      bottomCellStyle.borderTopWidth = '3px';
    } else {
      bottomCellStyle.marginTop = '2px';
      bottomCellStyle.borderTopWidth = '1px'; /* needed because react */
    }
    const staticCell = (
      <div style={staticCellStyle}>
        {staticChar || '\u00A0'}
      </div>
    );
    const editableCell = (
      <div style={editableCellStyle} onClick={this.startEditing}>
        {isEditing
          ? <input ref={this.refInput} onChange={this.cellChanged} onKeyDown={this.keyDown}
              type='text' value={editableChar||''} style={{width: '19px', height: '20px', border: 'none', textAlign: 'center'}} />
          : (editableChar || '\u00A0')}
      </div>
    );
    const lock = (
      <div style={{marginTop: '2px', textAlign: 'center', cursor: 'pointer'}} onClick={this.lockClicked}>
        {isHint || <i className={classnames(['fa', isLocked ? 'fa-lock' : 'fa-unlock-alt'])} />}
      </div>
    );
    if (editableRow === 'top') {
      return (
        <div style={columnStyle}>
          {editableCell}{staticCell}{lock}
        </div>
      );
    } else {
      return (
        <div style={columnStyle}>
          {staticCell}{editableCell}{lock}
        </div>
      );
    }
  }
  componentDidUpdate () {
    if (this._input) {
      this._input.select();
      this._input.focus();
    }
  }
  startEditing = () => {
    if (!this.props.isLocked && !this.props.isEditing) {
      this.props.onEditingStarted(this.props.rank);
    }
  };
  keyDown = (event) => {
    let handled = true;
    if (event.key === 'ArrowRight') {
      this.props.onEditingMoved(0, 1);
    } else if (event.key === 'ArrowLeft') {
      this.props.onEditingMoved(0, -1);
    } else if (event.key === 'ArrowUp') {
      this.props.onEditingMoved(-1, 0);
    } else if (event.key === 'ArrowDown') {
      this.props.onEditingMoved(1, 0);
    } else if (event.key === 'Escape' || event.key === 'Enter') {
      this.props.onEditingCancelled();
    } else {
      handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  cellChanged = () => {
    const value = this._input.value.substr(-1); /* /!\ IE compatibility */
    this.props.onChangeChar(this.props.rank, value);
  };
  lockClicked = () => {
    this.props.onChangeLocked(this.props.rank, !this.props.isLocked);
  };
  refInput = (element) => {
    this._input = element;
  };
}

export default {
  actions: {
    rotorCellEditStarted: 'Rotor.Cell.Edit.Started',
    rotorCellEditMoved: 'Rotor.Cell.Edit.Moved',
    rotorCellEditCancelled: 'Rotor.Cell.Edit.Cancelled',
    rotorCellLockChanged: 'Rotor.Cell.Lock.Changed',
    rotorCellCharChanged: 'Rotor.Cell.Char.Changed',
    rotorKeyLoaded: 'Rotor.Key.Loaded',
  },
  actionReducers: {
    appInit: appInitReducer,
    rotorCellEditStarted: rotorCellEditStartedReducer,
    rotorCellEditMoved: rotorCellEditMovedReducer,
    rotorCellEditCancelled: rotorCellEditCancelledReducer,
    rotorCellLockChanged: rotorCellLockChangedReducer,
    rotorCellCharChanged: rotorCellCharChangedReducer,
    rotorKeyLoaded: rotorKeyLoadedReducer,
  },
  views: {
    Rotor: connect(RotorSelector)(RotorView)
  }
};
