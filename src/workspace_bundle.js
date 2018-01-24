
import React from 'react';

export default function (bundle) {

  bundle.use('CipheredText', 'SelectedText', 'FrequencyAnalysis', 'DecodingRotor');
  bundle.defineView('Workspace', WorkspaceSelector, Workspace);

}

function WorkspaceSelector (state) {
  const {CipheredText, SelectedText, FrequencyAnalysis, DecodingRotor} = state.scope;
  return {CipheredText, SelectedText, FrequencyAnalysis, DecodingRotor};
}

class Workspace extends React.PureComponent {
  render () {
    const {CipheredText, SelectedText, FrequencyAnalysis, DecodingRotor} = this.props;
    return (
      <div>
        <h2>{"Message chiffré"}</h2>
        <CipheredText/>
        <h2>{"Sélection de lignes ou colonnes"}</h2>
        <SelectedText/>
        <h2>{"Analyse de fréquence de la sélection"}</h2>
        <FrequencyAnalysis/>
        <h2>{"Rotor de déchiffrement"}</h2>
        <DecodingRotor/>
      </div>
    );
  }
}
