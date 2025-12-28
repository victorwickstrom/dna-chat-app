import Ajv, { type ErrorObject, type JSONSchemaType } from 'ajv'
import schemaJson from '../models/queryPlan.schema.json'
import type { QueryPlan } from '../models/queryPlan'

const schema = schemaJson as unknown as JSONSchemaType<QueryPlan>
const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile<QueryPlan>(schema)

export const validateQueryPlan = (data: unknown): QueryPlan => {
  if (!validate(data)) {
    const message = formatErrors(validate.errors ?? [])
    throw new Error(`QueryPlan validation failed: ${message}`)
  }
  return data as QueryPlan
}

const formatErrors = (errors: ErrorObject[]): string => {
  if (errors.length === 0) {
    return 'Okänd valideringsmisslyckande.'
  }
  return errors.map((err) => `${err.instancePath || '/'} ${err.message ?? ''}`.trim()).join('; ')
}
