
import {call, take} from 'redux-saga/effects';
import {buffers, eventChannel} from 'redux-saga';

export function* windowHeightMonitorSaga (platformApi) {
    const channel = eventChannel(emit => {
        function onResize () {
            const height = window.document.body.clientHeight;
            emit({height});
        }
        window.addEventListener('resize', onResize);
        return function () {
            window.removeEventListener('resize', onResize);
        };
    }, buffers.sliding(1));
    try {
        let lastHeight;
        while (true) {
            const {height} = yield take(channel);
            if (height !== lastHeight) {
                yield call(platformApi.updateDisplay, {height});
                lastHeight = height;
            }
        }
    } finally {
        channel.close();
    }
}
