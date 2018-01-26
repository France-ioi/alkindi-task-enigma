/*
- shows a slice of the clearText
- adds deciphered characters from start up to the "current" animation position
  (lazily computed)
- scrolling does not affect the current animation position?
*/


import React from 'react';

import {updateGridGeometry, updateGridVisibleRows} from './utils';

export default function (bundle) {
  bundle.use('appInit', 'taskInit', 'taskReset');
  bundle.addReducer('appInit', appInitReducer);
  bundle.addReducer('taskInit', taskInitReducer);

  bundle.defineAction('decipheredTextResized', 'DecipheredText.Resized'
    /* {width: number, height: number} */);
  bundle.addReducer('decipheredTextResized', decipheredTextResizedReducer);

  bundle.defineAction('decipheredTextScrolled', 'DecipheredText.Scrolled'
    /* {scrollTop: number} */);
  bundle.addReducer('decipheredTextScrolled', decipheredTextScrolledReducer);

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
  decipheredText = updateGridVisibleRows({...decipheredText, nbCells: cipherText.length}, gridUpdateOptions(state));
  return {...state, decipheredText};
}

function decipheredTextResizedReducer (state, {payload: {width}}) {
  let {decipheredText} = state;
  decipheredText = {...decipheredText, width, height: 4 * decipheredText.cellHeight};
  decipheredText = updateGridGeometry(decipheredText);
  decipheredText = updateGridVisibleRows(decipheredText, gridUpdateOptions(state));
  return {...state, decipheredText};
}

function gridUpdateOptions (state) {
  const {taskData: {cipherText}} = state;
  const getCell = index => ({ciphered: cipherText[index], clear: 'Z', current: false, locked: false});
  return {getCell};
}

function decipheredTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {decipheredText} = state;
  decipheredText = {...decipheredText, scrollTop};
  decipheredText = updateGridVisibleRows(decipheredText, gridUpdateOptions(state));
  return {...state, decipheredText};
}

function DecipheredTextViewSelector (state) {
  const {scope, decipheredText} = state;
  const {decipheredTextResized, decipheredTextScrolled} = scope;
  const {width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible} = decipheredText;
  return {
    decipheredTextResized, decipheredTextScrolled,
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
              {columns.map(({index, ciphered, clear, locked, current}) =>
                <div key={index} style={{position: 'absolute', left: `${index * cellWidth}px`, width: `${cellWidth}px`, height: `42px`, border: 'solid #777', borderWidth: '1px 0'}}>
                  <div style={{width: '100%', height: '20px', borderBottom: '1px solid #ccc', textAlign: 'center'}}>{ciphered || ' '}</div>
                  <div style={{width: '100%', height: '20px', textAlign: 'center'}}>{clear || ' '}</div>
                </div>)}
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

}
