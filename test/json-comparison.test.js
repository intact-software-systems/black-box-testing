import {compareJson, COMPARISON, toConfig} from '../src/compareJson.js'
import {loadJsonFile} from '../src/utils.js'

Deno.test('hello', async (_) => {

    const expected = await loadJsonFile('../test/expected-computed.json')
    const actual = await loadJsonFile('../test/actual-computed.json')

    const ignoreJsonKeys = [
        'balanceId', 'accountId', 'auditDetails', 'stackTrace', 'legAccountId', 'createdTimeStamp', 'uuid', 'createdDate', 'transactionUUID'
    ]

    const ignoreJsonPaths = [
        'accountsCreated.inputDto.accountsToCreateByIban.NO3030606105130.account.profitCentre'
    ]

    let comparisonResult = compareJson(expected, actual, toConfig(COMPARISON.COMPATIBLE, ignoreJsonKeys, ignoreJsonPaths))

    console.log(JSON.stringify(comparisonResult))
})
