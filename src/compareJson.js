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

function isValueEqual(expected, actual) {
    if (!expected && !actual) {
        return true
    }

    if (expected === undefined && actual) {
        return false
    }

    if (expected && actual === undefined) {
        return false
    }

    if (Number.isFinite(expected) && !Number.isFinite(actual)) {
        if (Number.isInteger(actual)) {
            return Number.parseInt(actual) === expected
        } else {
            return Number.parseFloat(actual) === expected
        }
    }

    if (!Number.isFinite(expected) && Number.isFinite(actual)) {
        if (Number.isInteger(actual)) {
            return Number.parseInt(expected) === actual
        } else {
            return Number.parseFloat(expected) === actual
        }
    }

    return expected === actual
}

function isCompatibleObjects(expected, actual, compareValues = true) {
    if (Array.isArray(expected)) {
        return isCompatibleArrays(expected, actual, compareValues)
    }

    for (const key of Object.keys(expected)) {

        if (expected[key] instanceof Object) {

            if (!(actual[key] instanceof Object)) {
                return toNotCompatible(expected, actual, '!(' + actual[key] + ') instanceof Object')
            }

            let compatibleObjects = isCompatibleObjects(expected[key], actual[key], compareValues)
            if (!compatibleObjects.isEqual) {
                return compatibleObjects
            }
        } else if (Array.isArray(expected[key])) {

            if (!Array.isArray(actual[key])) {
                return toNotCompatible(expected, actual, '!Array.isArray(' + actual[key] + ')')
            }

            let compatibleArrays = isCompatibleArrays(expected[key], actual[key], compareValues)
            if (!compatibleArrays.isEqual) {
                return compatibleArrays
            }
        } else {

            if (!actual.hasOwnProperty(key)) {
                return toNotCompatible(expected, actual, '!' + actual + '.hasOwnProperty(' + key + ')')
            }

            if (compareValues && !isValueEqual(expected[key], actual[key])) {
                return toNotCompatible(expected, actual, '!isValueEqual(' + expected[key] + ', ' + actual[key] + ')')
            }
        }
    }
    return toCompatible()
}

function isCompatibleArrays(expected, actual, compareValues = true) {
    if (!Array.isArray(actual)) {
        return toNotCompatible(expected, actual, 'expected array was object')
    }

    if (expected.length > actual.length) {
        return toNotCompatible(expected, actual, 'Expected that expected.length > actual.length but was ' + expected.length + '<= ' + actual.length)
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
                let compatibilityMessage = isCompatibleArrays(expectedValue, actualValue, compareValues)
                if (!compatibilityMessage.isEqual) {
                    return compatibilityMessage
                }
            } else {
                let compatibilityMessage = isCompatibleObjects(expectedValue, actualValue, compareValues)
                if (compatibilityMessage.isEqual) {
                    expectedFound.push(expectedValue)
                    actualToCompare[j] = undefined
                    expectedNotFound[i] = undefined
                }
            }
        }
    }

    if (compareValues) {
        return expectedFound.length === expected.length
            ? toCompatible()
            : toNotCompatible(expected, actual, 'Json structure not compatible', {
                expectedFound: expectedFound.filter(a => a !== undefined),
                expectedNotFound: expectedNotFound.filter(a => a !== undefined),
                actualNotFound: actualToCompare.filter(a => a !== undefined)
            })
    } else {
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


export function isJsonCompatible(expected, actual) {
    return Array.isArray(expected)
        ? isCompatibleArrays(expected, actual, true)
        : isCompatibleObjects(expected, actual, true)
}

export function isJsonStructureCompatible(expected, actual) {
    return Array.isArray(expected)
        ? isCompatibleArrays(expected, actual, false)
        : isCompatibleObjects(expected, actual, false)
}
