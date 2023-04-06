import {readFileSync} from 'https://deno.land/std@0.175.0/node/fs.ts'
import {parse} from 'https://deno.land/std@0.175.0/encoding/yaml.ts'

function randomIban(countryCode, technicalOrgNum) {
    return countryCode + randomInteger(20, 90) + technicalOrgNum + randomInteger(1000000, 9999999)
}

function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

function generateReplace(generate, config) {
    const filtered = generate
        .map(value => {
            switch (value) {
                case 'uuid':
                    return {
                        uuid: crypto.randomUUID()
                    }
                case 'iban':
                    return {
                        iban: config.bankOrgID
                            ? randomIban(config.country, config.bankOrgID)
                            : undefined
                    }
                case 'date':
                    return {
                        date: new Date().toISOString().slice(0, 10)
                    }
                case 'bankOrgID':
                    return {
                        bankOrgID: randomInteger(1000, 9999999).toString()
                    }
                case 'orgId':
                    return {
                        orgId: '0' + randomInteger(10000000000000000, 99999999999999999).toString()
                    }
                case 'amount':
                    return {
                        amount: randomInteger(1, 99999999)
                    }
                default:
                    return undefined
            }
        })
        .filter(gen => gen !== undefined)


    const generated = filtered.length === 0
        ? {}
        : filtered.reduce((a, b) => {
            return {...a, ...b}
        })

    if (generate.includes('iban') && !generated.iban) {
        return {
            ...generated,
            iban: randomIban(config.country, config.bankOrgID || generated.bankOrgID)
        }
    }
    return generated
}

function toReplaceGlobal(generate, replace) {
    const defaultReplace = {
        env: 'DEV',
        sys: 'LED',
        source: 'INT',
        country: 'NO',
        currency: 'NOK',
        userID: 'aTestTool'
    }

    const generatedReplace = generateReplace(
        generate,
        {
            ...defaultReplace,
            ...replace
        }
    )

    return {
        ...defaultReplace,
        ...replace,
        ...generatedReplace
    }
}

function inputReplacesToJson(input) {
    if (!input || input.length <= 1) {
        return {}
    }

    const values = input.split(',')
    if (values.length <= 0) {
        return {}
    }

    let resultJson = {}

    for (const element of values) {

        const obj = {}

        const value = element.split(':=')
        if (value.length !== 2) {
            console.warn('Ignoring replace. Failed to parse replace in input ' + input + ' Failed with ' + value)
            return {}
        }

        obj[value[0]] = value[1]

        resultJson = {...obj, ...resultJson}
    }

    return resultJson
}


let workingDirectory = '.'

function toPath(name) {
    return workingDirectory + '/' + name
}

function getValuePaths(currPath, item, valuePaths = []) {
    if (!Array.isArray(item) && typeof item !== 'object')
        valuePaths.push(currPath)

    if (Array.isArray(item)) {
        item.forEach((el, idx) => getValuePaths(`${currPath}.${idx}`, el, valuePaths))
    }
    else if (item && typeof item === 'object') {
        Object.entries(item)
            .forEach(([key, value]) => {
                getValuePaths(`${currPath}.${key}`, value, valuePaths)
            })
    }
    return valuePaths
}

export function getAllValuePaths(data) {
    return Object.entries(data)
        .map(([key, value]) => {
            return [...new Set([key, ...getValuePaths(key, value)])]
        })
        .flatMap(a => a)
}

export async function loadJsonFile(fileName) {
    return await import (
        fileName,
        {
            assert: {type: 'json'}
        }
        )
        .then(a => a.default)
        .catch(e => {
            console.error(e)
            return {}
        })
}

export default {
    setWorkingDirectory: dir => workingDirectory = dir || '.',

    openFile: fileName => {
        const text = readFileSync(toPath(fileName)).toString()

        if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
            return parse(text)
        }
        return JSON.parse(text)
    },

    toReplace: (generate, replace) => {
        return toReplaceGlobal(generate || [], replace || {})
    },

    generateReplace: (generate, config) => {
        if (!generate.length) {
            return []
        }
        return generateReplace(generate || [], config || {})
    },

    inputReplacesToJson: csv => inputReplacesToJson(csv),

    resolvePathData: (path, obj) => {
        return path.split('.')
            .reduce((prev, curr) => prev ? prev[curr] : null, obj || self)
    }
}
