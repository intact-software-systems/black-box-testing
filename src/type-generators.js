import { v4 } from "https://deno.land/std@0.156.0/uuid/mod.ts"

function toRandomInteger(min, max) {
    return Number.parseInt(
        Math.floor(Math.random() * (max - min)) + min
    )
}

function toDateSplit(date) {
    let dateSplit = date.split('-')

    return [
        Number.parseInt(dateSplit[0]),
        Number.parseInt(dateSplit[1]),
        Number.parseInt(dateSplit[2])
    ]
}

function toRandomYear(min, max) {
    return toRandomInteger(
        toDateSplit(min)[0],
        toDateSplit(max)[0]
    )
}

function toDateRangeForMonth(month) {
    switch (month) {
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
        case 12:
            return [1, 31]
        case 2:
            return [1, 28]
        case 4:
        case 6:
        case 9:
        case 11:
        default:
            return [1, 30]
    }
}

function toRandomMonthInYear(year, min, max) {
    const start = toDateSplit(min)
    const end = toDateSplit(max)

    if (year > start[0] && year < end[0]) {
        return toRandomInteger(1, 12)
    }

    if (year === start[0] && year < end[0]) {
        return toRandomInteger(start[1], 12)
    }

    if (year === start[0] && year === end[0]) {
        return toRandomInteger(start[1], end[1])
    }

    return toRandomInteger(1, 12)
}

function toRandomDayInMonth(month, min, max) {
    const start = toDateSplit(min)
    const end = toDateSplit(max)

    const dateRange = toDateRangeForMonth(month)

    if (month > start[1] && month < end[1]) {
        return toRandomInteger(dateRange[0], dateRange[1])
    }

    if (month === start[1] && month < end[1]) {
        return toRandomInteger(start[2], dateRange[1])
    }

    if (month === start[1] && month === end[1]) {
        return toRandomInteger(start[2], end[2])
    }

    return toRandomInteger(1, 12)
}

function toRandomDate(min, max) {
    if (max === 'now') {
        max = new Date(Date.now())
            .toISOString()
            .slice(0, 10)
    }

    const year = toRandomYear(min, max)
    const month = toRandomMonthInYear(year, min, max)
    let day = toRandomDayInMonth(month, min, max)

    return new Date(year, month - 1, day)
        .toISOString()
        .slice(0, 10)
}

function toRandomFloat(min, max, decimals) {
    let num = Math.random() * (max - min) + min
    return roundToDecimals(num, decimals || 2)
}

function roundToDecimals(num, decimals) {
    if (decimals < 0) {
        decimals = 0
    }
    return +(Math.round(num + 'e+' + decimals) + 'e-' + decimals)
}

function toRandomIban(countryCode, technicalOrgNum) {
    return countryCode + toRandomInteger(20, 90) + technicalOrgNum + toRandomInteger(1000000, 9999999)
}

function toRandomIbans(countryCode, technicalOrgNum, numberOf) {
    return new Array(numberOf)
        .fill(0)
        .map(() => toRandomIban(countryCode, technicalOrgNum))
}

function toRandomIntegers(min, max, numberOf) {
    return new Array(numberOf)
        .fill(0)
        .map(() => toRandomInteger(min, max))
}

function toRandomFloats(min, max, numberOf, decimals) {
    return new Array(numberOf)
        .fill(0)
        .map(() => toRandomFloat(min, max, decimals))
}

function toRandomDates(min, max, numberOf) {
    return new Array(numberOf)
        .fill(0)
        .map(() => toRandomDate(min, max))
}

function toUuids(numberOf) {
    return new Array(numberOf)
        .fill(0)
        .map(() => v4())
}

function toRandomTechnicalOrgNum() {
    return toRandomInteger(1000, 9999999).toString()
}

export function toRandomFromType(type, min, max, numberOf, decimals) {
    switch (type) {
        case 'iban':
            return toRandomIbans('NO', toRandomTechnicalOrgNum(), numberOf)
        case 'int':
        case 'integer':
            return toRandomIntegers(min, max, numberOf)
        case 'float':
        case 'floating':
        case 'floatingPoint':
            return toRandomFloats(min, max, numberOf, decimals)
        case 'date':
            return toRandomDates(min, max, numberOf)
        case 'uuid':
            return toUuids(numberOf)
    }

    return []
}
