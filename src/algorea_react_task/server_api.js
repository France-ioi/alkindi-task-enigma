
import fetchPonyfill from 'fetch-ponyfill';

const {fetch} = fetchPonyfill();

export default function makeServerApi (config) {
    return function (service, action, body) {
        return new Promise(function (resolve, reject) {
            const url = new URL(service, config.baseUrl);
            const devel = config.devel ? {task: config.devel} : {};
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({...body, ...devel, action})
            }).then(function (response) {
                if (response.status !== 200) return reject(response);
                response.json().catch(reject).then(function (result) {
                    if (!result.success) return reject(result.error);
                    resolve(result.data);
                });
            }).catch(reject);
        });
    };
}
