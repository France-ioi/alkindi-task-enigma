
var fs = require('fs');
var path = require('path');
var {range} = require('range');
var seedrandom = require('seedrandom');
var {shuffle} = require('shuffle');
var {generate} = require('./sentences');

/* prefer JSON config file at project root?  depend on NODE_ENV? */
module.exports.config = {
    cache_task_data: false
};

/*
    The rotors and keys are specified from the perspective of the task, i.e.,
    for decoding.
    The "top-editable" and "bottom-editable" settings mean, respectively:
    - "top-editable": the top of the decoding rotor is editable, the bottom
      part is the (leftward) rotating alphabet, hence decoding is (S;R(1))
      and encoding is (S^-1;R(-1)).
    - "bottom-editable": the bottom of the rotor is editable, the top part is
      the (leftward) rotating alphabet, hence decoding is (R(-1);S) and
      encoding is (S^-1;R(1)).
*/
const versionRotors = [
    [],
    [{schedule: 1, editableRow: 'top'}],
    [{schedule: 1, editableRow: 'top'}, {schedule: 0, editableRow: 'top'}],
    [{schedule: 1, editableRow: 'top'}, {schedule: 26, editableRow: 'top'}, {schedule: 26*26, editableRow: 'top'}]
];

module.exports.taskData = function (args, callback) {
    const {publicData, privateData} = generateTaskData(args.task);
    // console.log(publicData.cipherText.slice(0, 80));
    // console.log(privateData.clearText.slice(0, 80));
    // console.log('E', privateData.encodingKeys);
    console.log('D', privateData.decodingKeys);
    /* XXX also pass privateData so that bsm can cache it? */
    /* XXX current generator returns hints; this could be wrong if publicData
           is shared */
    callback(null, publicData);
};

module.exports.requestHint = function (args, callback) {
    const request = args.request;
    const hints_requested = args.task.hints_requested ? JSON.parse(args.task.hints_requested) : [];
    for (var hintRequest of hints_requested) {
        if (hintRequest === null) { /* XXX Happens, should not. */
            console.log('XXX', args.task.hints_requested);
            continue;
        }
        if (typeof hintRequest === 'string') {
            hintRequest = JSON.parse(hintRequest);
        }
        if (hintRequestEqual(hintRequest, request)) {
            return callback(new Error('hint already requested'));
        }
    }
    callback(null, args.request);
};

module.exports.gradeAnswer = function (args, task_data, callback) {
    let {rotors: submittedKeys} = JSON.parse(args.answer.value);
    const {publicData: {alphabet, cipherText, rotors}, privateData: {keys, clearText}} = generateTaskData(args.task);
    const hints_requested = args.task.hints_requested ? JSON.parse(args.task.hints_requested) : [];
    submittedKeys = submittedKeys.map(cells => cells.map(i => i === -1 ? ' ' : alphabet[i]).join(''));
    // submittedKeys.map(key => inversePermutation(alphabet, key));
    const evalLength = 200; /* Score on first 200 characters only */
    const evalText = cipherText.slice(0, evalLength);
    const decodedText = enigmaDecode(alphabet, rotors, submittedKeys, evalText);
    let correctChars = 0;
    for (let i = 0; i < evalLength; i += 1) {
        if (clearText[i] === decodedText[i]) {
            correctChars += 1;
        }
    }
    let score = 0, message = "Il y a au moins une différence entre les 200 premiers caractères de votre texte déchiffré et ceux du texte d'origine.";
    if (correctChars == evalLength) {
        const nHints = hints_requested.length;
       score = Math.max(0, 100 - nHints * 5);
       message = `Bravo, vous avez bien déchiffré le texte. Vous avez utilisé ${nHints} indice${nHints > 1 ? 's' : ''}.`;
    }
    callback(null, {
        score: score,
        message: message,
    });
};

function generateTaskData (task) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const alphabetSize = alphabet.length;
    const rng0 = seedrandom(task.random_seed);
    const rngKeys = seedrandom(rng0());
    const rngText = seedrandom(rng0());
    const version = parseInt(task.params.version) || 0;
    const clearText = generate(rngText, 30000, 31000, false);
    const rotors = versionRotors[version]; // specification of decoding rotors
    const encodingKeys = generateKeys(alphabet, rngKeys, rotors); // encoding keys in decoding order
    const decodingKeys = encodingKeys.map(key => inversePermutation(alphabet, key));
    const cipherText = enigmaEncode(alphabet, rotors, encodingKeys, clearText);
    const frequencies = range(0, alphabet.length).map(start =>
        frequencyAnalysis(cipherText, alphabet, start, alphabetSize));
    const hintsRequested = task.hints_requested ? JSON.parse(task.hints_requested).filter(hr => hr !== null) : [];
    /* Add E -> E mappings to fixed rotors */
    rotors.forEach(function (rotor, rotorIndex) {
        if (rotor.schedule === 0) {
            hintsRequested.push({rotorIndex, cellRank: alphabet.indexOf('E')});
        }
    });
    const hints = grantHints(decodingKeys, hintsRequested);
    const publicData = {
        alphabet,
        cipherText,
        rotors,
        hints,
        frequencies,
        referenceFrequencies
    };
    const privateData = {
        clearText,
        encodingKeys,
        decodingKeys
    };
    return {publicData, privateData};
}

const referenceFrequencies = [
  {symbol: 'E', proba: 0.1715},
  {symbol: 'A', proba: 0.0812},
  {symbol: 'S', proba: 0.0795},
  {symbol: 'I', proba: 0.0758},
  {symbol: 'T', proba: 0.0724},
  {symbol: 'N', proba: 0.0709},
  {symbol: 'R', proba: 0.0655},
  {symbol: 'U', proba: 0.0637},
  {symbol: 'L', proba: 0.0545},
  {symbol: 'O', proba: 0.0540},
  {symbol: 'D', proba: 0.0367},
  {symbol: 'C', proba: 0.0334},
  {symbol: 'P', proba: 0.0302},
  {symbol: 'M', proba: 0.0297},
  {symbol: 'V', proba: 0.0163},
  {symbol: 'Q', proba: 0.0136},
  {symbol: 'F', proba: 0.0107},
  {symbol: 'B', proba: 0.0090},
  {symbol: 'G', proba: 0.0087},
  {symbol: 'H', proba: 0.0074},
  {symbol: 'J', proba: 0.0054},
  {symbol: 'X', proba: 0.0039},
  {symbol: 'Y', proba: 0.0031},
  {symbol: 'Z', proba: 0.0013},
  {symbol: 'W', proba: 0.0011},
  {symbol: 'K', proba: 0.0005}
];

function generateKeys (alphabet, rngKeys, rotors) {
    const keys = new Array(rotors.length);
    for (let i = rotors.length - 1; i >= 0; i -= 1) {
        const rotor = rotors[i];
        let key = shuffle({random: rngKeys, deck: alphabet.split('')}).cards.join('');
        if (rotor.schedule === 0) {
            /* Make the task solution predictable by ensuring a fixed rotor maps E to E. */
            key = swapLetters(key, 'E', key[alphabet.indexOf('E')]);
        }
        keys[i] = key;
    }
    return keys;
}

function swapLetters (key, c1, c2) {
    const i = key.indexOf(c1);
    const j = key.indexOf(c2);
    return key.replace(key[i], '*').replace(key[j], key[i]).replace('*', key[j]);
}

function enigmaEncode (alphabet, rotors, keys, text) {
    for (let i = rotors.length - 1; i >= 0; i -= 1) {
        const rotor = rotors[i];
        const key = keys[i];
        if (rotor.editableRow === 'top') {
            text = rotateAndSubstitute(alphabet, key, -rotor.schedule, text);
        } else {
            text = substituteAndRotate(alphabet, key, rotor.schedule, text);
        }
    }
    return text;
}

function enigmaDecode (alphabet, rotors, keys, text) {
    for (let i = 0; i < rotors.length; i += 1) {
        const rotor = rotors[i];
        const key = keys[i];
        if (rotor.editableRow === 'top') {
            text = substituteAndRotate(alphabet, key, rotor.schedule, text);
        } else {
            text = rotateAndSubstitute(alphabet, key, -rotor.schedule, text);
        }
    }
    return text;
}

function rotateAndSubstitute (alphabet, key, schedule, text) {
    const chars = new Array();
    const n = alphabet.length;
    key = inversePermutation(alphabet, key);
    for (let i = 0; i < text.length; i += 1) {
        let c = text[i];
        let j = alphabet.indexOf(c);
        if (j !== -1) {
            j = rotate(j, i * schedule, n);
            c = key[j];
        }
        chars[i] = c;
    }
    return chars.join('');
}
function substituteAndRotate (alphabet, key, schedule, text) {
    const chars = new Array();
    const n = alphabet.length;
    key = inversePermutation(alphabet, key);
    for (let i = 0; i < text.length; i += 1) {
        let c = text[i];
        let j = alphabet.indexOf(c);
        if (j !== -1) {
            j = alphabet.indexOf(key[j]);
            j = rotate(j, i * schedule, n);
            c = alphabet[j];
        }
        chars[i] = c;
    }
    return chars.join('');
}

function rotate (i, j, n) {
    if (j < 0) {
        j = j % n + n;
    }
    return (i + j) % n;
}

function inversePermutation (alphabet, key) {
    const result = new Array(alphabet.length).fill(' ');
    for (let i = 0; i < alphabet.length; i += 1) {
        let pos = alphabet.indexOf(key[i]);
        if (pos !== -1) {
            result[pos] = alphabet[i];
        }
    }
    return result.join('');
}

function frequencyAnalysis (text, alphabet, start, skip) {
    const freqs = new Array(alphabet.length).fill(0);
    let total = 0;
    for (let i = start; i < text.length; i += skip) {
        let c = text[i];
        let j = alphabet.indexOf(c);
        if (j !== -1) {
            freqs[j] += 1;
            total += 1;
        }
    }
    for (let i = 0; i < alphabet.length; i += 1) {
        freqs[i] = round(freqs[i] / total, 4);
    }
    return freqs;
}

function round (value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function hintRequestEqual (h1, h2) {
    return h1.rotorIndex === h2.rotorIndex && h1.cellRank == h2.cellRank;
}

function grantHints (decodingKeys, hintRequests) {
    return hintRequests.map(function (hintRequest) {
        if (typeof hintRequest === 'string') {
            hintRequest = JSON.parse(hintRequest);
        }
        const {rotorIndex, cellRank} = hintRequest;
        const symbol = decodingKeys[rotorIndex][cellRank];
        return {rotorIndex, cellRank, symbol};
    });
}

function testTopEditable (alphabet, key) {
    /*
    Encode for decoding by this rotor spec:
      {schedule: 1, editableRow: 'top'}
    Example
    - alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    - key      = "UWYGADFPVZBECKMTHXSLRINQOJ"
           s   =(EKMFLGDQVZNTOWYHXUSPAIBRCJ→ABCDEFGHIJKLMNOPQRSTUVWXYZ)
           s^-1=(UWYGADFPVZBECKMTHXSLRINQOJ→ABCDEFGHIJKLMNOPQRSTUVWXYZ)
                  r^-1           s^-1           s           r^1
          ENIGMA ------> EMGDIV ------> ACFGVI ---> EMGDIV -----> ENIGMA
    */
    let text = "ENIGMA";
    console.log(text);
    text = enigmaEncode(alphabet, [{schedule: 1, editableRow: 'top'}], [inversePermutation(alphabet, key)], text);
    console.log(text, text === 'ACFGVI');
    text = enigmaDecode(alphabet, [{schedule: 1, editableRow: 'top'}], [key], text);
    console.log(text, text === 'ENIGMA');
}
function testBottomEditable (alphabet, key) {
    /*
    Encode for decoding by this rotor spec:
      {schedule: 1, editableRow: 'bottom'}
    Example
    - alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    - key      = "EKMFLGDQVZNTOWYHXUSPAIBRCJ"
           s   =(ABCDEFGHIJKLMNOPQRSTUVWXYZ→UWYGADFPVZBECKMTHXSLRINQOJ)
           s^-1=(ABCDEFGHIJKLMNOPQRSTUVWXYZ→EKMFLGDQVZNTOWYHXUSPAIBRCJ)
                   s^-1           r^i           r^-i           s
           ENIGMA ------> LWVDOE -----> LXXGSJ ------> LWVDOE ------> ENIGMA
    */
    let text = "ENIGMA";
    console.log(text);
    text = enigmaEncode(alphabet, [{schedule: 1, editableRow: 'bottom'}], [inversePermutation(alphabet, key)], text);
    console.log(text, text === 'LXXGSJ');
    text = enigmaDecode(alphabet, [{schedule: 1, editableRow: 'bottom'}], [key], text);
    console.log(text, text === 'ENIGMA');
}

//testTopEditable(alphabet, "UWYGADFPVZBECKMTHXSLRINQOJ");
//testBottomEditable(alphabet, "EKMFLGDQVZNTOWYHXUSPAIBRCJ");
// module.exports.taskData({task: {random_seed: 368301513808961193, params: {version: '1'}}}, function (error, task) { console.log(task); });
// module.exports.taskData({task: {random_seed: 668982797963448899, params: {version: '2'}}}, function (error, task) { console.log(task); });

/*
function autoTest () {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const clearText = "LESGENSSONTASSEZSOUVENTSCEPTIQUESSURLESCHOSESSAUFSIONLEURFOURNITUNEPREUVECREDIBL";
    const rotors = [{schedule: 1, editableRow: 'top'}];
    const decodingKeys = ['XCBKWJSYOMFVGDIZHRQEPTNAUL'];
    const encodingKeys = decodingKeys.map(key => inversePermutation(alphabet, key));
    const encodedText = enigmaEncode(alphabet, rotors, encodingKeys, clearText);
    if (encodedText !== "VKHKXOGVSWMZSJHFBABBFQATWJZQSDHLGVGOCESZELBDXLSLMTFZDFBRDXODMWUOOXHXCDBBFYTYJMCF")
        throw new Error('encoding is broken');
    const decodedText = enigmaDecode(alphabet, rotors, decodingKeys, encodedText);
    console.log(decodedText);
}
// autoTest();
// module.exports.taskData({task: {random_seed: 371813677522622012, params: {version: '1'}}}, function (error, task) {});
*/

!function () {
    module.exports.gradeAnswer({
        task: {random_seed: 300348454218987061, params: {version: '2'}, hints_requested: "[]"},
        answer: {value: '{"rotors":[[2,7,13,18,1,25,15,24,16,0,10,3,12,20,23,4,9,5,17,21,22,6,11,14,19,8],[16,23,2,20,4,8,11,10,6,5,-1,14,19,12,13,18,17,7,9,21,15,22,-1,25,3,24]]}'}
    }, {}, function (err, result) {
        if (err) { console.log(err); return; }
        console.log(JSON.stringify(result, null, 2));
    });
}();

