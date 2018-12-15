
- task.getState only gets hints, use a selector?

http://concours-alkindi.fr/tasks/2018/enigma

# Generation

Frequency analysis is pre-computed on a larger text.
The task shows only a part of that text.



# Views

- TextArea
- DualTextArea
- RowColSelectionTextArea
- FrequencyAnalysis
- SubstitutionRotor
- SubstitutionRotorHints

# State

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

# Actions

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



# Server modules

The folder `server-modules` contains files to be installed with [bebras-server-modules](https://github.com/France-ioi/bebras-server-modules).
