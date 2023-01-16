import toJsonSchema from 'npm:@openapi-contrib/openapi-schema-to-json-schema@latest'
import jsf from 'npm:json-schema-faker@latest'
// After fix use this one: import jsf from 'npm:json-schema-faker@latest/esm'

jsf.option({
    useExamplesValue: true,
    random: () => 0.000001
})

export const SchemaType = {
    OPENAPI: 'openapi',
    JSON: 'json'
}

export function toSchemaType(schema) {
    return schema.openapi ? SchemaType.OPENAPI : SchemaType.JSON
}

export function toJsonMock(type, schema) {
    if (!schema) {
        return undefined
    }

    switch (type) {
        case SchemaType.OPENAPI:
            return toJsonMockFromOpenapi(schema)
        case SchemaType.JSON:
        default:
            return toJsonMockFromJsonSchema(schema)
    }
}

function toJsonMockFromOpenapi(schema) {
    let jsonSchema = toJsonSchema(schema)

    if (jsonSchema?.properties) {
        jsonSchema.required = Object.entries(jsonSchema?.properties)
            .map(([key, value]) => {
                if (value?.type === 'array') {
                    return key
                }
                return value?.required ? key : undefined
            })
            .filter(v => v !== undefined)
    }

    return jsf.generate(jsonSchema)
}

function toJsonMockFromJsonSchema(schema) {
    return jsf.generate(schema)
}
