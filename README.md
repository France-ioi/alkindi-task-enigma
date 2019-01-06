# Installation

1. `git submodule update --init` to install bebras-modules
2. `npm install` to install dependencies
3. `npm run-script build` to build the js packages
4. Add server modules to bebras-server-modules as described below
5. Install shuffle and range either globally either to the bebras-server-modules folder by running `npm install shuffle range` in that folder.
6. Edit `options.server_module.baseUrl` in `index.html` to point to the bebras-server-modules installation (by default, it should be `http://your.server:3101/`).

## Server modules installation

The folder `server-modules` contains files to be installed with [bebras-server-modules](https://github.com/France-ioi/bebras-server-modules). These files handle the server-side logic of the task. The client-side will communicate with them through bebras-server-modules to fetch task data or hints.

1. Install bebras-server-modules as described in its `README.md`
2. Copy alkindi-task-enigma's subfolder `server-modules` to a subfolder of bebras-server-modules, for instance `bebras-server-modules/tasks/enigma/`
3. Add the task to bebras-server-modules, for instance go to `bebras-server-modules` folder and then run `node command.js tasks:add http://concours-alkindi.fr/tasks/2018/enigma tasks/enigma/index.js`(the task ID `http://concours-alkindi.fr/tasks/2018/enigma` can be changed)

# Usage

Make the files readable by a webserver, and then add the task to a token-generating platform such as [AlgoreaPlatform](https://github.com/France-ioi/AlgoreaPlatform). That platform must be configured to generate tokens using the public key of bebras-server-modules (by default, that public key is stored in `bebras-server-modules/tasks_demo/grader_public.key`).

The URL must contain the task ID set for the server modules, and a version number to select the task difficulty, for instance `http://example.com/alkindi-task-enigma/?taskID=http%3A%2F%2Fconcours-alkindi.fr%2Ftasks%2F2018%2Fenigma&version=1`.

If you want to use the task locally without a platform, you will need to use the development options below.

## Devel options

If `DEV_MODE` is enabled on bebras-server-modules, you can send an object instead of the task token, allowing you to easily test the task outside of any token-generating platform and to use custom data.

This object can be specified through the `options.server_module.devel` variable set in `index.html`, which will be sent to bebras-server-modules instead of the task token if it is present.

These keys will be read by the server :
* `itemUrl` (required) : full URL of the task, with the task ID and version number as described in the section above
* `randomSeed` (required) : integer determined the random seed to be used (send the same number each time to test the task with the same data)
* `sHintsRequested` (optional) : a JSON-encoded array of hints (to be) requested to the server

Example of `options` variable with these devel options :
```
var options = {
    server_module: {
        baseUrl: 'http://example.com:3101/',
        devel: {
            itemUrl: "http://example.com/?taskID=http%3A%2F%2Fconcours-alkindi.fr%2Ftasks%2F2018%2Fenigma&version=1",
            randomSeed: 1,
            sHintsRequested: "[{\"rotorIndex\": 0, \"cellRank\": 1}]"
        }
    },
};
```

# Task

- task.getState only gets hints, use a selector?

http://concours-alkindi.fr/tasks/2018/enigma

## Generation

Frequency analysis is pre-computed on a larger text.
The task shows only a part of that text.



## Views

- TextArea
- DualTextArea
- RowColSelectionTextArea
- FrequencyAnalysis
- SubstitutionRotor
- SubstitutionRotorHints

## State

    {
        taskData: {
            cipherText: string,
            alphabet: string,
        },
        cipheredText: {
            height: number,
            width: number,
            cellWidth: number,
            cellHeight: number,
            pageRows: number,
            pageColumns: number,
            scrollTop: number,
            bottom: number, /* pixels, bottom position of last line of full text */
            visibleRows: [{row: number, columns: [{col: number, symbol: string(1)}]}]
        },
        selectedText: {
            height: number,
            width: number,
            cellWidth: number,
            cellHeight: number,
            pageRows: number,
            pageColumns: number,
            scrollTop: number,
            bottom: number,
            mode: 'lines' or 'columns',
            indices: [number],
            visibleRows: [{row: number, columns: [{col: number, symbol: string(1)}], selected: bool}] or null
            visibleColumns: [{col: number, rows: [{row: number, symbol: string(1)}], selected: bool}] or null
        },
        frequencyAnalysis: {
            current: [{symbol: string(1), probability: number}] /* depends on selection */,
            reference: [{symbol: string(1), probability: number}] /* can be reordered */,
        },
        decodingRotor: [
            cells: [{cipher: string(1), clear: string(1), isLocked: bool}] /* always at pos 0; clear,locked can be edited */
            state: 'start' or 'pause' or 'play' or 'end'
            speed: number /* characters per second */,
            nextDecodedPos: number,
        },
        decipheredText: {
            height: number /* pixels, height of display area */,
            width: number /* pixels, width of display area */,
            cellWidth: number /* pixels /,
            cellHeight: number /* pixels */,
            pageRows: number,
            pageColumns: number,
            scrollTop: number /* pixels, scroll position */,
            bottom: number,
            visibleRows: [
                {
                    row: number,
                    columns: [{
                        col: number,
                        cipher: string(1),
                        selected: bool,
                        clear: string(1),
                        locked: bool
                    }]
                }
            ]
        }
        hints: { /* rotor at position 0 */
            rotor: [{cipher: string(1), clear: string(1)}],
        },
    }

## Actions

    CipheredText.Resized {width: number, height: number}

    Selection.View.Resized {width: number, height: number}
    Selection.View.Scrolled {top: number} or {amount: 'page' or 'line', direction: 'up' or 'down'}
    Selection.Mode.Changed {mode: 'rows' or 'columns'}
    Selection.Columns.Changed {value: number}
    Selection.Changed {selected: bool} union ({} or {index: number})

    RotorAnimationRewinded
    RotorAnimationStarted
    RotorAnimationPaused
    RotorAnimationFastForwarded
    RotorAnimationSkipped
    RotorAnimationStepped {direction: 'forward' or 'backward'}

    DecipheredTextHeightChanged {height: number}
    DecipheredTextScrolled {top: number}

    RotorLetterHintRequested



