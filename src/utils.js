import { v4 } from "https://deno.land/std@0.156.0/uuid/mod.ts";
import {readFileSync, writeFile} from "https://deno.land/std@0.156.0/node/fs.ts";

function randomIban(countryCode, technicalOrgNum) {
    return countryCode + randomInteger(20, 90) + technicalOrgNum + randomInteger(1000000, 9999999)
}

function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

function uuid() {
    return v4()
}

function generateReplace(generate, config) {
    const filtered = generate
        .map(value => {
            switch (value) {
                case 'uuid':
                    return {
                        uuid: uuid()
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

function inputOverridesToJson(input) {
    if (!input || input.length <= 1) {
        return {}
    }

    const values = input.split(',')
    if (values.length <= 0) {
        return {}
    }

    let resultJson = {}

    for (let i = 0; i < values.length; i++) {

        const obj = {}

        const value = values[i].split('=')
        if (value.length !== 2) {
            console.warn('Ignoring overrides. Failed to parse overrides in input ' + input + ' Failed with ' + value)
            return {}
        }

        obj[value[0]] = value[1]

        resultJson = {...obj, ...resultJson}
    }

    return resultJson
}


let workingDirectory = '.';

function toPath(name) {
    return workingDirectory + "/" + name
}

export default {
    setWorkingDirectory: dir => workingDirectory = dir || '.',

    saveToFile: (fileName, data) => {
        writeFile(fileName, JSON.stringify(data, null, 2), 'utf8', (err) => {
            if (err) {
                throw 'Failed to save' + err
            }
        })
    },

    openFile: fileName => {
        return JSON.parse(readFileSync(toPath(fileName)).toString())
    },

    toReplace: (generate, replace) => {
        return toReplaceGlobal(generate || [], replace || {})
    },

    generateReplace: (generate, config) => {
        if(!generate.length) {
            return []
        }
        return generateReplace(generate || [], config || {})
    },

    flattenInputArray: array => array
        .reduce((a, b) => {
            if (Array.isArray(a) && Array.isArray(b)) {
                return [...a, ...b]
            }
            else if (Array.isArray(a)) {
                return [...a, b]
            }
            else if (Array.isArray(b)) {
                return [a, ...b]
            }
            return [a, b]
        }),

    inputOverridesToJson: csv => inputOverridesToJson(csv)
}