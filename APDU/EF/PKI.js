// @ts-check
const Command = require('../Command')
const FieldLengthMap = require('./FieldLengthMap')
const DataStructure = require('../DataStructure')
const APDUTransmit = require('../APDUTransmit')

const AccessPKIEF = async (reader, protocol) => await APDUTransmit(reader, protocol, [Command.DIR.EF.PKI])

async function GetPKI(reader, protocol) {
  const SCDataExistenceAndLength = await FieldLengthMap.GetFieldLengthMap(reader, protocol)
  console.log(SCDataExistenceAndLength)

  await AccessPKIEF(reader, protocol)

  const PKIDataLength = DataStructure.PKI.reduce((acc, b) => SCDataExistenceAndLength[b].isExist ? acc + parseInt(SCDataExistenceAndLength[b].length, 16) : acc, 0)
  
  const PKIResult = {}
  
  if (PKIDataLength === 0) {
    DataStructure.PKI.forEach(PKIKey => PKIResult[PKIKey] = null)
  } else {
    const readPKI = await APDUTransmit(reader, protocol, Command.READ_DATA(PKIDataLength))

    const readablePKIData = Buffer.from(readPKI.reduce((acc, segment) => `${acc}${segment}`, ''), 'hex').toString('utf8')

    let PKIPointer = 0

    DataStructure.PKI.forEach(PKIKey => {
      if (SCDataExistenceAndLength[PKIKey].isExist) {
        const PKILength = parseInt(SCDataExistenceAndLength[PKIKey].length, 16)
        const PKIData = readablePKIData.substring(PKIPointer, PKIPointer + PKILength)
        PKIResult[PKIKey] = PKIData

        PKIPointer += PKILength
      } else {
        PKIResult[PKIKey] = null
      }
    })
  }

  return PKIResult
}

async function SetPKI(reader, protocol, data) {
  // extract data
  const filteredNewData = {}

  DataStructure.PKI.forEach(b => {
    if (data.hasOwnProperty(b)) {
      filteredNewData[b] = data[b]
    }
  })

  // merge with current data
  const currentPKI = await GetPKI(reader, protocol)
  const mergedPKI = { ...currentPKI, ...filteredNewData }

  // parse data to HEX, calculate length
  const mergedPKILength = DataStructure.PKI.reduce((acc, b) => (mergedPKI[b] !== null) ? acc + mergedPKI[b].length : acc, 0)
  const mergedPKIString = DataStructure.PKI.reduce((acc, b) => (mergedPKI[b] !== null) ? `${acc}${mergedPKI[b]}` : acc, '')
  const mergedPKIStringHEX = Buffer.from(mergedPKIString, 'utf8').toString('hex')

  // input data to card
  await AccessPKIEF(reader, protocol)
  
  const writePKIData = await APDUTransmit(reader, protocol, Command.WRITE_DATA(mergedPKILength, mergedPKIStringHEX))

  // update field length map value
  const filteredNewDataForFieldLength = Object.keys(filteredNewData).reduce((acc, f) => ({ ...acc, [f]: filteredNewData[f].length.toString(16) }), {})
  const setFiledLengthMap = await FieldLengthMap.SetFieldLengthMap(reader, protocol, filteredNewDataForFieldLength)

  return setFiledLengthMap
}

module.exports = {
  get: GetPKI,
  set: SetPKI
}