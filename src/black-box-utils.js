export const SUCCESS = 'SUCCESS'
export const FAILURE = 'FAILURE'

export function toBody(request) {
    if (request.form) {
        return new URLSearchParams(request.form)
    }

    return request.body && request.method !== undefined && request.method !== 'GET'
        ? JSON.stringify(request.body)
        : undefined
}

export async function toJson(res) {
    return res.json()
        .catch(() => {
            return {}
        })
}

export function toStatus(config, result, actualJson, res, interaction, results = {}) {
    return {
        name: config.interactionName,
        status: FAILURE,
        result: result,
        method: interaction.request.method || 'GET',
        path: interaction.request.path,
        scenarioExecutionNumber: config.interaction.request.scenarioExecutionNumber,
        interactionExecutionNumber: config.interaction.request.interactionExecutionNumber,
        expected: interaction.response,
        actual: {
            body: actualJson,
            statusCode: res.status,
            statusText: res.statusText
        },
        details: results,
        ...config
    }
}

export function toSuccessStatus(config, actualJson, response, interaction) {
    return {
        name: config.interactionName,
        status: SUCCESS,
        method: interaction.request.method,
        path: interaction.request.path,
        scenarioExecutionNumber: config.interaction.request.scenarioExecutionNumber,
        interactionExecutionNumber: config.interaction.request.interactionExecutionNumber,
        expected: interaction.response,
        actual: {
            body: actualJson,
            statusCode: response.status,
            statusText: response.statusText
        },
        output: interaction.request.output,
        input: interaction.request.input
    }
}

export function toInteractionName(interactionWithConfig) {
    return Object.keys(interactionWithConfig)
        .filter(key => key !== 'HTTP')
        [0]
}

export function toInteractionConfig(interactionWithConfig) {
    const name = toInteractionName(interactionWithConfig)

    return {
        interactionName: name,
        ...interactionWithConfig[name]
    }
}

export function toNetworkInteraction(interaction) {
    return interaction?.HTTP || interaction?.MQ
}

export function toRequest(request, output) {
    if (!request.input || request.input.length <= 0) {
        return request
    }

    let returnRequest = JSON.stringify(request)

    request.input
        .map(i => {
            const data = output.get(i)
            if (data === undefined) {
                throw 'Input data was not found: ' + i
            }
            return data
        })
        .forEach(data => {
            const getValuePaths = (currPath, item, valuePaths = []) => {
                if (!Array.isArray(item) && typeof item !== 'object')
                    valuePaths.push(currPath)

                if (Array.isArray(item)) {
                    item.forEach((el, idx) => getValuePaths(`${currPath}.${idx}`, el, valuePaths))
                }
                else if (item && typeof item == 'object') {
                    Object.entries(item)
                        .forEach(([key, value]) => {
                            getValuePaths(`${currPath}.${key}`, value, valuePaths)
                        })
                }
                return valuePaths
            }

            const resolve = (path, obj) => {
                return path.split('.')
                    .reduce((prev, curr) => prev ? prev[curr] : null, obj || self)
            }

            Object.entries(data)
                .forEach(([key, value]) => {
                    getValuePaths(key, value)
                        .forEach(path => {
                            const pathData = resolve(path, data)

                            returnRequest = returnRequest.replaceAll('{' + path + '}', pathData)
                        })

                })

        })

    return JSON.parse(returnRequest)

}

export function toOutputKey(interactionData) {
    return interactionData.scenarioExecutionNumber + '-' + interactionData.name + '-' + interactionData.interactionExecutionNumber
}

export function fetchDataBasic(request) {
    return fetch(
        request.path,
        {
            method: request.method,
            credentials: request.credentials ? request.credentials : 'omit',
            mode: request.mode ? request.mode : 'cors',
            headers: request.headers,
            body: toBody(request)
        }
    )
}
