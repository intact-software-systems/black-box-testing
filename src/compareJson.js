const ANY = 'any'
const ANY_INTEGER = 'integer'
const ANY_FLOAT = 'float'
const ANY_STRING = 'string'

function toNotCompatible(expected, actual, message, details = {}) {
    return {
        isEqual: false,
        message: message,
        expected: expected,
        actual: actual,
        ...details
    }
}

function toCompatible() {
    return {
        isEqual: true
    }
}

function isValueEqual(expected, actual, compareExact = false) {
    if (!expected && !actual) {
        return true
    }

    if (expected === undefined && actual) {
        return false
    }

    if (expected && actual === undefined) {
        return false
    }

    if (!compareExact) {

        if (expected === ANY) {
            return true
        }

        if (expected === ANY_INTEGER) {
            const number = Number.parseInt(actual)
            return Number.isInteger(number)
        }

        if (expected === ANY_FLOAT) {
            const number = Number.parseFloat(actual)
            return number % 1 !== 0
        }

        if (expected === ANY_STRING) {
            return typeof actual === 'string'
        }
    }

    if (Number.isFinite(expected) && !Number.isFinite(actual)) {
        if (Number.isInteger(actual)) {
            return Number.parseInt(actual) === expected
        }
        else {
            return Number.parseFloat(actual) === expected
        }
    }

    if (!Number.isFinite(expected) && Number.isFinite(actual)) {
        if (Number.isInteger(actual)) {
            return Number.parseInt(expected) === actual
        }
        else {
            return Number.parseFloat(expected) === actual
        }
    }

    return expected === actual
}

function isIdenticalArrays(a, b) {
    for (const aKey of a) {
        if (!b.find(bKey => bKey === aKey)) {
            return toNotCompatible(a, b, ' Not exact equal keys in json object', {keyNotExpected: aKey})
        }
    }

    for (const bKey of b) {
        if (!a.find(aKey => aKey === bKey)) {
            return toNotCompatible(a, b, ' Not exact equal keys in json object', {keyNotExpected: bKey})
        }
    }
    return toCompatible()
}

function isCompatibleObjects(expected, actual, config) {
    if (Array.isArray(expected)) {
        return isCompatibleArrays(expected, actual, config)
    }

    if (config.compareExact) {
        const compatibilityMessage = isIdenticalArrays(Object.keys(expected), Object.keys(actual))
        if (!compatibilityMessage.isEqual) {
            return compatibilityMessage
        }
    }

    for (const key of Object.keys(expected)) {

        if (config.ignoreJsonKeys.includes(key)) {
            continue
        }

        if (expected[key] instanceof Object) {

            if (!(actual[key] instanceof Object)) {
                return toNotCompatible(expected, actual, '!(' + actual[key] + ') instanceof Object')
            }

            let compatibleObjects = isCompatibleObjects(expected[key], actual[key], config)
            if (!compatibleObjects.isEqual) {
                return compatibleObjects
            }
        }
        else if (Array.isArray(expected[key])) {

            if (!Array.isArray(actual[key])) {
                return toNotCompatible(expected, actual, '!Array.isArray(' + actual[key] + ')')
            }

            let compatibleArrays = isCompatibleArrays(expected[key], actual[key], config)
            if (!compatibleArrays.isEqual) {
                return compatibleArrays
            }
        }
        else {

            if (!actual.hasOwnProperty(key)) {
                return toNotCompatible(expected, actual, '!' + actual + '.hasOwnProperty(' + key + ')')
            }

            if (config.compareValues && !isValueEqual(expected[key], actual[key], config.compareExact)) {
                return toNotCompatible(expected, actual, '!isValueEqual(' + expected[key] + ', ' + actual[key] + ')')
            }
        }
    }
    return toCompatible()
}

function isCompatibleArrays(expected, actual, config) {
    if (!Array.isArray(actual)) {
        return toNotCompatible(expected, actual, 'expected array was object')
    }

    const expectedFound = []
    const expectedNotFound = [...expected]
    const actualToCompare = [...actual]

    for (let i = 0; i < expected.length; i++) {

        const expectedValue = expected[i]

        // Algorithm: find first actualValue in actual that is identical to expectedValue
        for (let j = 0; j < actualToCompare.length; j++) {
            if (actualToCompare[j] === undefined) {
                continue
            }

            const actualValue = actualToCompare[j]

            if (Array.isArray(expectedValue)) {
                let compatibilityMessage = isCompatibleArrays(expectedValue, actualValue, config)
                if (!compatibilityMessage.isEqual) {
                    return compatibilityMessage
                }
            }
            else {
                let compatibilityMessage = isCompatibleObjects(expectedValue, actualValue, config)
                if (compatibilityMessage.isEqual) {
                    expectedFound.push(expectedValue)
                    actualToCompare[j] = undefined
                    expectedNotFound[i] = undefined
                }
            }
        }
    }

    if (config.compareExact) {
        const actualNotFound = actualToCompare.filter(a => a !== undefined)
        if (actualNotFound.length > 0) {
            return toNotCompatible(expected, actual, 'Json structures not exact equals', {
                expectedFound: expectedFound.filter(a => a !== undefined),
                expectedNotFound: expectedNotFound.filter(a => a !== undefined),
                actualNotFound: actualNotFound
            })
        }
    }

    if (config.compareValues) {
        return expectedFound.length === expected.length
            ? toCompatible()
            : toNotCompatible(expected, actual, 'Json structures not compatible', {
                expectedFound: expectedFound.filter(a => a !== undefined),
                expectedNotFound: expectedNotFound.filter(a => a !== undefined),
                actualNotFound: actualToCompare.filter(a => a !== undefined)
            })
    }
    else {
        let foundExpected = expectedFound.length >= expected.length
        if (!foundExpected) {
            return toNotCompatible(expected, actual, 'Did not find the expected in actual', {
                expectedFound: expectedFound.filter(a => a !== undefined),
                expectedNotFound: expectedNotFound.filter(a => a !== undefined),
                actualNotFound: actualToCompare.filter(a => a !== undefined)
            })
        }
        return toCompatible()
    }
}

export function compareJson(expected, actual, config) {
    return Array.isArray(expected)
        ? isCompatibleArrays(expected, actual, config)
        : isCompatibleObjects(expected, actual, config)
}

export const COMPARISON = {
    COMPATIBLE_STRUCTURE: 'compatible-structure',
    COMPATIBLE: 'compatible',
    EXACT_STRUCTURE: 'exact-structure',
    EXACT: 'exact'
}

export function toConfig(comparison, ignoreJsonKeys, ignoreJsonPaths, allValuePaths) {
    switch (comparison.toLowerCase()) {
        case COMPARISON.COMPATIBLE_STRUCTURE:
            return toConfigDto(false, false, ignoreJsonKeys, ignoreJsonPaths, allValuePaths)
        case COMPARISON.COMPATIBLE:
            return toConfigDto(true, false, ignoreJsonKeys, ignoreJsonPaths, allValuePaths)
        case COMPARISON.EXACT_STRUCTURE:
            return toConfigDto(false, true, ignoreJsonKeys, ignoreJsonPaths, allValuePaths)
        case COMPARISON.EXACT:
            return toConfigDto(true, true, ignoreJsonKeys, ignoreJsonPaths, allValuePaths)
        default:
            throw {
                error: 'Comparison unsupported: ' + comparison.toLowerCase(),
                comparisons: COMPARISON
            }
    }
}

function toConfigDto(compareValues, compareExact, ignoreJsonKeys, ignoreJsonPaths, allValuePaths) {
    return {
        compareValues,
        compareExact,
        ignoreJsonKeys,
        ignoreJsonPaths,
        allValuePaths
    }
}
