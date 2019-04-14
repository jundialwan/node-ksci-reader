// @ts-check
const Biodata = require('./EF/Biodata')
const PKI = require('./EF/PKI')
const FieldLengthMap = require('./EF/FieldLengthMap')

module.exports = {
  GetBiodata: Biodata.get,
  WriteBiodata: Biodata.set,
  GetPKI: PKI.get,
  WritePKI: PKI.set,
  ResetFieldLengthMap: FieldLengthMap.ResetFieldLengthMap
}