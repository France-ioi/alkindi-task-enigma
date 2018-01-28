
import React from 'react';
import {connect} from 'react-redux';
import classnames from 'classnames';
import {range} from 'range';
import update from 'immutability-helper';

import {makeRotor, editRotorCell, lockRotorCell} from './utils';

function appInitReducer (state, _action) {
  return {...state, rotors: []};
}

function taskInitReducer (state, _action) {
  const {taskData: {alphabet, rotors: rotorSpecs}} = state;
  const rotors = rotorSpecs.map(spec => makeRotor(alphabet, spec));
  return {...state, rotors};
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

function RotorSelector (state, {index}) {
  const {actions: {rotorCellLockChanged, rotorCellCharChanged}, rotors, scheduling: {shifts}} = state;
  const {editableRow, cells} = rotors[index];
  const shift = shifts[index];
  return {rotorCellLockChanged, rotorCellCharChanged, editableRow, cells, shift};
}

class RotorView extends React.PureComponent {
  render () {
    const {editableRow, cells, shift} = this.props;
    const nbCells = cells.length;
    return (
      <div style={{width: `${20*nbCells}px`, margin: '0 auto'}}>
        <div className='clearfix'>
          {range(0, nbCells).map(rank => {
            const {editable, locked, conflict} = cells[rank];
            const isEditing = this.state.editing === rank;
            const isLast = nbCells === rank + 1;
            const shiftedIndex = (rank + shift) % nbCells;
            const {rotating} = cells[shiftedIndex];
            return (
              <RotorCell key={rank} rank={rank} isLast={isLast} editableRow={editableRow}
                staticChar={rotating} editableChar={editable} isLocked={locked} isEditing={isEditing}
                onChangeChar={this.onChangeChar} onChangeLocked={this.onChangeLocked}
                onEditingStarted={this.onEditingStarted} isConflict={conflict} />);
          })}
        </div>
      </div>
    );
  }
  state = {editing: false};
  onChangeChar = (rank, symbol) => {
    symbol = symbol.toUpperCase();
    this.props.dispatch({type: this.props.rotorCellCharChanged, payload: {rotorIndex: this.props.index, rank, symbol}});
    this.setState({editing: false});
  };
  onChangeLocked = (rank, isLocked) => {
    this.props.dispatch({type: this.props.rotorCellLockChanged, payload: {rotorIndex: this.props.index, rank, isLocked}});
  };
  onEditingStarted = (rank) => {
    this.setState({editing: rank});
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
          ? <input ref={this.refInput} onChange={this.cellChanged}
              type='text' value={editableChar||''} style={{width: '19px', height: '20px', border: 'none'}} />
          : (editableChar || '\u00A0')}
      </div>
    );
    const lock = (
      <div style={{marginTop: '2px', textAlign: 'center', cursor: 'pointer'}} onClick={this.lockClicked}>
        <i className={classnames(['fa', isLocked ? 'fa-lock' : 'fa-unlock-alt'])} />
      </div>
    )
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
  startEditing = (event) => {
    if (!this.props.isLocked && !this.props.isEditing) {
      this.props.onEditingStarted(this.props.rank);
    }
  };
  cellChanged = (event) => {
    const value = this._input.value.substr(-1); /* /!\ IE compatibility */
    this.props.onChangeChar(this.props.rank, value);
  };
  lockClicked = (event) => {
    this.props.onChangeLocked(this.props.rank, !this.props.isLocked);
  };
  refInput = (element) => {
    this._input = element;
  };
}

export default {
  actions: {
    rotorCellLockChanged: 'Rotor.Cell.Lock.Changed',
    rotorCellCharChanged: 'Rotor.Cell.Char.Changed',
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    rotorCellLockChanged: rotorCellLockChangedReducer,
    rotorCellCharChanged: rotorCellCharChangedReducer,
  },
  views: {
    Rotor: connect(RotorSelector)(RotorView)
  }
}
