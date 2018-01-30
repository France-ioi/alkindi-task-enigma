
import React from 'react';
import {connect} from 'react-redux';
import classnames from 'classnames';
import {range} from 'range';
import update from 'immutability-helper';

import {wrapAround, makeRotor, editRotorCell, lockRotorCell, updateRotorWithKey} from './utils';

function appInitReducer (state, _action) {
  return {...state, rotors: [], editing: {}};
}

function taskInitReducer (state, _action) {
  const {taskData: {alphabet, rotors: rotorSpecs}} = state;
  const rotors = rotorSpecs.map(spec => makeRotor(alphabet, spec));
  return {...state, rotors};
}

function rotorCellEditStartedReducer (state, {payload: {rotorIndex, cellRank}}) {
  let {taskData: {alphabet}, rotors} = state;
  rotorIndex = wrapAround(rotorIndex, rotors.length);
  cellRank = wrapAround(cellRank, alphabet.length);
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
      rotorCellEditCancelled, rotorCellEditStarted
    },
    rotors, scheduling: {shifts}, editing
  } = state;
  const {editableRow, cells} = rotors[index];
  const shift = shifts[index];
  const editingRank = editing.rotorIndex === index ? editing.cellRank : null;
  return {
    rotorCellEditStarted, rotorCellEditCancelled,
    rotorCellLockChanged, rotorCellCharChanged,
    editableRow, cells, shift, editingRank
  };
}

class RotorView extends React.PureComponent {
  render () {
    const {index, editableRow, cells, shift, editingRank} = this.props;
    const nbCells = cells.length;
    return (
      <div style={{width: `${20*nbCells}px`, margin: '0 auto'}}>
        <div className='clearfix'>
          {range(0, nbCells).map(rank => {
            const {editable, locked, conflict} = cells[rank];
            const isEditing = editingRank === rank;
            const isLast = nbCells === rank + 1;
            const shiftedIndex = (rank + shift) % nbCells;
            const {rotating} = cells[shiftedIndex];
            return (
              <RotorCell key={rank} rank={rank} isLast={isLast} editableRow={editableRow}
                staticChar={rotating} editableChar={editable} isLocked={locked} isEditing={isEditing}
                onChangeChar={this.onChangeChar} onChangeLocked={this.onChangeLocked}
                onEditingStarted={this.onEditingStarted} onEditingCancelled={this.onEditingCancelled}
                onGoToRotor={this.goToRotor} isConflict={conflict} />);
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
  goToRotor = (rotorInc, rank) => {
    this.props.dispatch({type: this.props.rotorCellEditStarted, payload: {rotorIndex: this.props.index + rotorInc, cellRank: rank}});
  };
}

class RotorCell extends React.PureComponent {
  /* XXX Clicking in the editable div and entering the same letter does not
         trigger a change event.  This behavior is unfortunate. */
  render () {
    const {staticChar, editableChar, isLocked, isEditing, editableRow, isLast, isConflict} = this.props;
    const staticCellStyle = {
      border: '1px solid black',
      borderRightWidth: isLast ? '1px' : '0',
      textAlign: 'center',
      marginTop: editableRow === 'top' ? '2px' : '0'
    };
    const staticCell = (
      <div style={staticCellStyle}>
        {staticChar || '\u00A0'}
      </div>
    );
    const editableCellStyle = {
      border: '1px solid black',
      borderRightWidth: isLast ? '1px' : '0',
      textAlign: 'center',
      marginTop: editableRow === 'top' ? '0' : '2px',
      cursor: 'text',
      backgroundColor: isConflict ? '#fcc' : '#fff'
    };
    const editableCell = (
      <div style={editableCellStyle} onClick={this.startEditing}>
        {isEditing
          ? <input ref={this.refInput} onChange={this.cellChanged} onKeyDown={this.keyDown}
              type='text' value={editableChar||''} style={{width: '19px', height: '20px', border: 'none'}} />
          : (editableChar || '\u00A0')}
      </div>
    );
    const lock = (
      <div style={{marginTop: '2px', textAlign: 'center', cursor: 'pointer'}} onClick={this.lockClicked}>
        <i className={classnames(['fa', isLocked ? 'fa-lock' : 'fa-unlock-alt'])} />
      </div>
    );
    if (editableRow === 'top') {
      return (
        <div style={{float: 'left', width: '20px'}}>
          {editableCell}{staticCell}{lock}
        </div>
      );
    } else {
      return (
        <div style={{float: 'left', width: '20px'}}>
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
      this.props.onEditingStarted(this.props.rank + 1);
    } else if (event.key === 'ArrowLeft') {
      this.props.onEditingStarted(this.props.rank - 1);
    } else if (event.key === 'Escape') {
      this.props.onEditingCancelled();
    } else if (event.key === 'ArrowUp') {
      this.props.onGoToRotor(-1, this.props.rank);
    } else if (event.key === 'ArrowDown') {
      this.props.onGoToRotor(1, this.props.rank);
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
    rotorCellEditCancelled: 'Rotor.Cell.Edit.Cancelled',
    rotorCellLockChanged: 'Rotor.Cell.Lock.Changed',
    rotorCellCharChanged: 'Rotor.Cell.Char.Changed',
    rotorKeyLoaded: 'Rotor.Key.Loaded',
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    rotorCellEditStarted: rotorCellEditStartedReducer,
    rotorCellEditCancelled: rotorCellEditCancelledReducer,
    rotorCellLockChanged: rotorCellLockChangedReducer,
    rotorCellCharChanged: rotorCellCharChangedReducer,
    rotorKeyLoaded: rotorKeyLoadedReducer,
  },
  views: {
    Rotor: connect(RotorSelector)(RotorView)
  }
};
