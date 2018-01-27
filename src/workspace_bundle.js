
import React from 'react';
import {range} from 'range';

export default function (bundle) {

  bundle.use('CipheredText', 'SelectedText', 'FrequencyAnalysis', 'Rotor', 'SchedulingControls', 'DecipheredText');
  bundle.defineView('Workspace', WorkspaceSelector, Workspace);

}

function WorkspaceSelector (state) {
  const {scope: {CipheredText, SelectedText, FrequencyAnalysis, Rotor, SchedulingControls, DecipheredText}, rotors} = state;
  return {CipheredText, SelectedText, FrequencyAnalysis, Rotor, SchedulingControls, DecipheredText, nbRotors: rotors.length};
}

class Workspace extends React.PureComponent {
  render () {
    const {CipheredText, SelectedText, FrequencyAnalysis, Rotor, SchedulingControls, DecipheredText, nbRotors} = this.props;
    return (
      <div>
        <h2>{"Message chiffré"}</h2>
        <CipheredText/>
        <h2>{"Sélection de lignes ou colonnes"}</h2>
        <SelectedText/>
        <h2>{"Analyse de fréquence de la sélection"}</h2>
        <FrequencyAnalysis/>
        <h2>{`Rotor${nbRotors > 1 ? 's' : ''} de déchiffrement`}</h2>
        {range(0, nbRotors).map(index => <Rotor key={index} index={index}/>)}
        <SchedulingControls/>
        <h2>{"Texte déchiffré"}</h2>
        <DecipheredText/>
      </div>
    );
  }
}
