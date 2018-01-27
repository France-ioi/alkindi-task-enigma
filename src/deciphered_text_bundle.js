/*
- shows a slice of the clearText
- adds deciphered characters from start up to the "current" animation position
  (lazily computed)
- scrolling does not affect the current animation position?
*/


import React from 'react';

import {updateGridGeometry, updateGridVisibleRows, applyRotors} from './utils';

export default function (bundle) {
  bundle.use('appInit', 'taskInit', 'taskReset', 'schedulingJump');
  bundle.addReducer('appInit', appInitReducer);
  bundle.addReducer('taskInit', taskInitReducer);

  bundle.defineAction('decipheredTextResized', 'DecipheredText.Resized'
    /* {width: number, height: number} */);
  bundle.addReducer('decipheredTextResized', decipheredTextResizedReducer);

  bundle.defineAction('decipheredTextScrolled', 'DecipheredText.Scrolled'
    /* {scrollTop: number} */);
  bundle.addReducer('decipheredTextScrolled', decipheredTextScrolledReducer);

  bundle.addLateReducer(decipheredTextLateReducer);

  bundle.defineView('DecipheredText', DecipheredTextViewSelector, DecipheredTextView);
}

function appInitReducer (state, _action) {
  return {...state, decipheredText: {
    cellWidth: 15,
    cellHeight: 46,
    scrollTop: 0,
    nbCells: 0
  }};
}

function taskInitReducer (state, _action) {
  let {decipheredText, taskData: {cipherText}} = state;
  decipheredText = {...decipheredText, nbCells: cipherText.length};
  return {...state, decipheredText};
}

function decipheredTextResizedReducer (state, {payload: {width}}) {
  let {decipheredText} = state;
  decipheredText = {...decipheredText, width, height: 4 * decipheredText.cellHeight};
  decipheredText = updateGridGeometry(decipheredText);
  return {...state, decipheredText};
}

function decipheredTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {decipheredText} = state;
  decipheredText = {...decipheredText, scrollTop};
  return {...state, decipheredText};
}

function decipheredTextLateReducer (state, action) {
  if (!state.taskData) return state;
  let {taskData: {alphabet, cipherText}, scheduling: {position}, rotors, decipheredText} = state;
  function getCell (index) {
    const ciphered = cipherText[index];
    const cell = {position: index, current: index === position, ciphered};
    let rank = alphabet.indexOf(ciphered);
    if (rank === -1) {
      cell.clear = ciphered;
    } else if (index <= position) {
      Object.assign(cell, applyRotors(rotors, index, rank));
      if (cell.rank !== -1) {
        cell.clear = alphabet[cell.rank];
      }
    }
    return cell;
  }
  decipheredText = updateGridVisibleRows(decipheredText, {getCell});
  return {...state, decipheredText};
}

function DecipheredTextViewSelector (state) {
  const {scope, decipheredText} = state;
  const {decipheredTextResized, decipheredTextScrolled, schedulingJump} = scope;
  const {width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible} = decipheredText;
  return {
    decipheredTextResized, decipheredTextScrolled, schedulingJump,
    width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns
  };
}

class DecipheredTextView extends React.PureComponent {

  render () {
    const {width, height, visibleRows, cellWidth, cellHeight, bottom} = this.props;
    return (
      <div>
        <div ref={this.refTextBox} onScroll={this.onScroll} style={{position: 'relative', width: width && `${width}px`, height: height && `${height}px`, overflowY: 'scroll'}}>
          {(visibleRows||[]).map(({index, columns}) =>
            <div key={index} style={{position: 'absolute', top: `${index * cellHeight}px`}}>
              {columns.map(({index, position, ciphered, clear, locks, current}) =>
                <TextCell key={index} column={index} position={position} ciphered={ciphered} clear={clear} locked={locks > 0} current={current} cellWidth={cellWidth} onJump={this.onJump} />)}
            </div>)}
          <div style={{position: 'absolute', top: `${bottom}px`, width: '1px', height: '1px'}}/>
        </div>
      </div>
    );
  }

  refTextBox = (element) => {
    this._textBox = element;
    const width = element.clientWidth;
    const height = element.clientHeight;
    this.props.dispatch({type: this.props.decipheredTextResized, payload: {width, height}});
  };

  onScroll = () => {
    const scrollTop = this._textBox.scrollTop;
    this.props.dispatch({type: this.props.decipheredTextScrolled, payload: {scrollTop}});
  };

  onJump = (position) => {
    this.props.dispatch({type: this.props.schedulingJump, payload: {position}});
  };

}

class TextCell extends React.PureComponent {
  render () {
    const {column, ciphered, clear, locked, current, cellWidth} = this.props;
    const cellStyle = {
      position: 'absolute',
      left: `${column * cellWidth}px`,
      width: `${cellWidth}px`,
      height: `42px`,
      border: 'solid #777',
      borderWidth: '1px 0',
      backgroundColor: current ? '#aaa' : (locked ? '#ccc' : '#fff')
    };
    return (
      <div style={cellStyle} onClick={this._jump}>
        <div style={{width: '100%', height: '20px', borderBottom: '1px solid #ccc', textAlign: 'center'}}>{ciphered || ' '}</div>
        <div style={{width: '100%', height: '20px', textAlign: 'center'}}>{clear || ' '}</div>
      </div>
    );
  }
  _jump = (_event) => {
    this.props.onJump(this.props.position);
  };
}
