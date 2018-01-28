
import React from 'react';
import {connect} from 'react-redux';
import {range} from 'range';
import seedrandom from 'seedrandom';

function appInitReducer (state, _action) {
  return {...state, frequencyAnalysis: {}};
}

function frequencyAnalysisLateReducer (state) {
  if (state.frequencyAnalysis && state.taskData) {
    let {taskData: {alphabet, referenceFrequencies, frequencies, cipherText}, selectedText: {mode, pageColumns, selectedRows, selectedColumns}, frequencyAnalysis} = state;
    let textFrequencies = [];
    if (mode === 'rows' && selectedRows.length !== 0) {
      const freqMap = new Map(alphabet.split('').map(c => [c, 0]));
      for (let index of selectedRows) {
        const startPos = index * pageColumns;
        const endPos = startPos + pageColumns - 1;
        countSymbols(freqMap, cipherText, startPos, endPos);
      }
      textFrequencies = normalizeAndSortFrequencies(freqMap.entries());
    } else if (mode === 'columns' && selectedColumns.length !== 0) {
      if (pageColumns !== 26) {
        const rng = seedrandom(selectedColumns.join(','));
        const baseProba = 1 / alphabet.length;
        const maxRefProba = referenceFrequencies.reduce((a, x) => Math.max(a, x.proba), 0);
        const epsilon = maxRefProba * 2 / 30; /* 2 pixels after scaling */
        const entries = alphabet.split('').map(c => [c, baseProba + epsilon * (rng() * 2 - 1)]);
        textFrequencies = normalizeAndSortFrequencies(entries);
      } else {
        const selectedFrequencies = new Array(alphabet.length).fill(0);
        for (let col of selectedColumns) {
          sumFrequencies(selectedFrequencies, frequencies[col]);
        }
        textFrequencies = normalizeAndSortFrequencies(
          selectedFrequencies.map((proba, i) => [alphabet[i], proba]));
      }
    }
    frequencyAnalysis = {...frequencyAnalysis, textFrequencies};
    state = {...state, frequencyAnalysis};
  }
  return state;
}

function countSymbols (map, text, startPos, endPos) {
  for (let pos = startPos; pos <= endPos; pos += 1) {
    countSymbol(map, text[pos]);
  }
}

function countSymbol (map, char) {
  const count = map.get(char);
  if (count !== undefined) {
    map.set(char, count + 1);
  }
}

function sumFrequencies (dst, add) {
  for (let i = 0; i < dst.length; i += 1) {
    dst[i] += add[i];
  }
}

function normalizeAndSortFrequencies (entries) {
  const result = Array.from(entries);
  const totalCount = result.reduce((a, x) => a + x[1], 0);
  result.sort(function (s1, s2) {
     const p1 = s1[1], p2 = s2[1];
     return p1 > p2 ? -1 : (p1 < p2 ? 1 : 0);
  });
  return result.map(([symbol, count]) => ({symbol, proba: count / totalCount}));
}

function FrequencyAnalysisSelector (state) {
  const {taskData: {alphabet, referenceFrequencies}, frequencyAnalysis: {textFrequencies}} = state;
  const scale = 30 / referenceFrequencies.reduce((a, x) => Math.max(a, x.proba), 0);
  return {
    alphabetSize: alphabet.length,
    referenceFrequencies,
    textFrequencies,
    scale
  };
}

class FrequencyAnalysisView extends React.PureComponent {
  render () {
    const {alphabetSize, referenceFrequencies, textFrequencies, scale} = this.props;
    if (!referenceFrequencies) return false;
    return (
      <div className='clearfix'>
        <div style={{float: 'left', width: '100px', height: '108px', fontSize: '10px', lineHeight: '10px', position: 'relative'}}>
          <div style={{height: '30px', position: 'absolute', top: '0px'}}>
            {"Fréquences dans le texte :"}
          </div>
          <div style={{height: '20px', position: 'absolute', top: '32px'}}>
            {"Symboles du texte :"}
          </div>
          <div style={{height: '20px', position: 'absolute', top: '56px'}}>
            {"Substitutions :"}
          </div>
          <div style={{height: '30px', position: 'absolute', top: '78px'}}>
            {"Fréquences en français :"}
          </div>
        </div>
        {range(0, alphabetSize).map(index =>
          <div key={index} style={{float: 'left', width: '20px', height: '108px', position: 'relative'}}>
            <TextFrequencyBox index={index} cell={textFrequencies[index]} scale={scale} />
            <ReferenceFrequencyBox index={index} cell={referenceFrequencies[index]} scale={scale} />
          </div>)}
      </div>
    );
  }
}

class TextFrequencyBox extends React.PureComponent {
  render () {
    const {cell, scale} = this.props;
    if (!cell) return false;
    return (
      <div style={{position: 'absolute', top: '0px'}}>
        <div style={{width: '20px', height: '30px', display: 'table-cell', verticalAlign: 'bottom'}}>
          <div style={{height: `${Math.min(30, Math.round(cell.proba * scale))}px`, width: '8px', marginLeft: '5px', background: 'black'}}/>
        </div>
        <div style={{width: '17px', height: '20px', border: '1px solid white', marginBottom: '2px', textAlign: 'center'}}>
          {cell.symbol}
        </div>
      </div>
    );
  }
}

class ReferenceFrequencyBox extends React.PureComponent {
  render () {
    const {cell, scale} = this.props;
    return (
      <div style={{position: 'absolute', top: '56px', cursor: 'move'}}>
        <div style={{width: '17px', height: '20px', border: '1px solid black', marginBottom: '2px', textAlign: 'center'}}>
          {cell.symbol}
        </div>
        <div style={{width: '20px', height: '30px', verticalAlign: 'top'}}>
          <div style={{height: `${Math.round(cell.proba * scale)}px`, width: '8px', marginLeft: '5px', background: 'black'}}/>
        </div>
      </div>
    );
  }
}

export default {
  actionReducers: {
    appInit: appInitReducer
  },
  lateReducer: frequencyAnalysisLateReducer,
  views: {
    FrequencyAnalysis: connect(FrequencyAnalysisSelector)(FrequencyAnalysisView)
  },
};
