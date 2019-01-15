# Installation

From the folder of the task :

1. `git submodule update --init` to install bebras-modules
2. `npm install` to install dependencies
3. `npm run-script build` to build the js packages
4. Add server modules to bebras-server-modules as described below
5. Install `shuffle` and `range` either globally either to the bebras-server-modules folder by running `npm install shuffle range` in that folder.
6. Edit `options.server_module.baseUrl` in `index.html` to point to the bebras-server-modules installation (by default, it should be `http://your.server:3101/`).

## Server modules installation

The folder `server-modules` contains files to be installed with [bebras-server-modules](https://github.com/France-ioi/bebras-server-modules). These files handle the server-side logic of the task. The client-side will communicate with them through bebras-server-modules to fetch task data or hints.

1. Install bebras-server-modules as described in its `README.md`
2. From the repository alkindi-task-enigma, copy the files from the subfolder `server-modules` files to a subfolder of bebras-server-modules, for instance `bebras-server-modules/tasks/enigma/`. The folder `bebras-server-modules/tasks/enigma/` should now contain two files, `index.js` and `sentences.js`.
3. Choose a `TASK_ID` for this task, for instance `alkindi-task-enigma`.
4. Add the task to bebras-server-modules : from the bebras-server-modules directory, run `node command.js tasks:add TASK_ID TASK_PATH` where you replace `TASK_ID` with the value you chose in the previous step, and `TASK_PATH` with the relative path to the files just copied. If you followed these instructions exactly, the command to run will then be `node command.js tasks:add alkindi-task-enigma tasks/enigma/index.js`

# Usage

The task can be used in two modes :

* Standalone : the task URL is loaded directly in the browser ; as of now, interaction with the task is limited without using development options (see section below)
* Through a platform, such as [AlgoreaPlatform](https://github.com/France-ioi/AlgoreaPlatform) : this allows full interaction with the task.

## Tokens

The task uses JSON Web tokens to exchange informations between the platform (if not in standalone mode), the task itself and the bebras-server-modules. It allows for authenticated communication between the components. When used in a platform, the token is passed to the task through the GET parameter `sToken` ; when used in standalone / development mode, the token is replaced with a normal javascript object.

## Standalone / Devel options

The task can be loaded standalone, without a platform, but it will then need development options enabled.

You need to :

1. Enable `DEV_MODE` on bebras-server-modules (in its `.env` configuration file)
2. Specify the object to be used as a token replacement in `options.server_module.devel` of `index.html`

This object should contain the following keys, which will be read by the bebras-server-modules :
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

## Through a platform

Make the files readable by a webserver, and then add the task to a token-generating platform such as [AlgoreaPlatform](https://github.com/France-ioi/AlgoreaPlatform). That platform must be configured to generate tokens using the public key of bebras-server-modules (by default, that public key is stored in `bebras-server-modules/tasks_demo/grader_public.key`).

The URL must contain the task ID set for the server modules, and a version number to select the task difficulty, for instance `http://example.com/alkindi-task-enigma/?taskID=alkindi-task-enigma&version=1`.

If you want to use the task locally without a platform, you will need to use the development options below.


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



