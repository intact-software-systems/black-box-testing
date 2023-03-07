import {executeInteraction} from './execute-black-box.js'

export function executeBlackBox(interactions, index) {
    const executeNext = interactionData => {
        if (index + 1 < interactions.length) {
            return executeBlackBox(interactions, ++index)
                .then(d => {
                    return {...data, ...d}
                })
                .catch(e => {
                    return {...data, ...e}
                })
        }
        else {
            return interactionData
        }
    }

    return executeInteraction(interactions[index])
        .then(data => executeNext(data))
        .catch(e => executeNext(e))
}

