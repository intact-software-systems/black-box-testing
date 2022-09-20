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
                return false
            }

            if (!isCompatibleObjects(expected[key], actual[key], compareValues)) {
                return false
            }
        } else if (Array.isArray(expected[key])) {

            if (!Array.isArray(actual[key])) {
                return false
            }

            if (!isCompatibleArrays(expected[key], actual[key], compareValues)) {
                return false
            }
        } else {

            if (!actual.hasOwnProperty(key)) {
                return false
            }

            if (compareValues && !isValueEqual(expected[key], actual[key])) {
                return false
            }
        }
    }
    return true
}


function isCompatibleArrays(expected, actual, compareValues = true) {
    if (!Array.isArray(actual)) {
        return false
    }

    if (expected.length > actual.length) {
        return false
    }

    const expectedFound = []
    const actualToCompare = [...actual]

    for (const expectedValue of expected) {

        // Algorithm: find first actualValue in actual that is identical to expectedValue
        for (let i = 0; i < actualToCompare.length; i++) {
            if (actualToCompare[i] === undefined) {
                continue
            }

            const actualValue = actualToCompare[i]

            if (Array.isArray(expectedValue)) {
                if (!isCompatibleArrays(expectedValue, actualValue, compareValues)) {
                    return false
                }
            } else if (isCompatibleObjects(expectedValue, actualValue, compareValues)) {
                expectedFound.push(expectedValue)
                actualToCompare[i] = undefined
            }
        }
    }

    return compareValues
        ? expectedFound.length === expected.length
        : expectedFound.length >= expected.length
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
