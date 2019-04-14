// @ts-check
const Command = require('../Command')
const FieldLengthMap = require('./FieldLengthMap')
const DataStructure = require('../DataStructure')
const APDUTransmit = require('../APDUTransmit')

const AccessBiodataEF = async (reader, protocol) => await APDUTransmit(reader, protocol, [Command.DIR.EF.BIODATA])

async function GetBiodata(reader, protocol) {
  const SCDataExistenceAndLength = await FieldLengthMap.GetFieldLengthMap(reader, protocol)
  console.log(SCDataExistenceAndLength)

  await AccessBiodataEF(reader, protocol)

  const biodataDataLength = DataStructure.BIODATA.reduce((acc, b) => SCDataExistenceAndLength[b].isExist ? acc + parseInt(SCDataExistenceAndLength[b].length, 16) : acc, 0)
  const biodataDataLengthHEX = `${('0').repeat(4 - biodataDataLength.toString(16).length)}${biodataDataLength.toString(16)}`
  console.log(biodataDataLengthHEX)

  let biodataResult = {}

  if (biodataDataLength === 0) {
    biodataResult = DataStructure.BIODATA.reduce((acc, biodataKey) => ({ ...acc, [biodataKey]: null }), {})
  } else {
    const getFullData = async (dataLength, dataGroup, dataExistenceAndLengthMap, dataByte) => {
      const responses = await APDUTransmit(reader, protocol, Command.READ_DATA(dataLength))

      let appendedResult = responses.reduce((acc, r) => `${acc}${r.substring(0, r.length - 4)}`, '')
      
      const resultObject = {}
      const dataGroupKeys = DataStructure[dataGroup]
      const readableGroupData = Buffer.from(appendedResult, 'hex').toString()
      let dataPointer = 0
    
      dataGroupKeys.forEach(dataKey => {
        if (dataExistenceAndLengthMap[dataKey].isExist) {
          const dataLength = parseInt(dataExistenceAndLengthMap[dataKey].length, 16)
          const data = readableGroupData.substring(dataPointer, dataPointer + dataLength)
          resultObject[dataKey] = data
    
          dataPointer += dataLength
        } else {
          resultObject[dataKey] = null
        }
      })
      dataPointer = 0

      return resultObject
    }

    biodataResult = await getFullData(biodataDataLength, 'BIODATA', SCDataExistenceAndLength)
  }

  return biodataResult
}

async function SetBiodata(reader, protocol, data) {
  // extract data
  const filteredNewData = {}

  DataStructure.BIODATA.forEach(b => {
    if (data.hasOwnProperty(b)) {
      filteredNewData[b] = data[b]
    }
  })

  // merge with current data
  const currentBiodata = await GetBiodata(reader, protocol)
  const mergedBiodata = { ...currentBiodata, ...filteredNewData }

  // parse data to HEX, calculate length
  const mergedBiodataLength = DataStructure.BIODATA.reduce((acc, b) => (mergedBiodata[b] !== null) ? acc + mergedBiodata[b].length : acc, 0)
  const mergedBiodataLengthHEX = mergedBiodataLength.toString(16)
  const mergedBiodataString = DataStructure.BIODATA.reduce((acc, b) => (mergedBiodata[b] !== null) ? `${acc}${mergedBiodata[b]}` : acc, '')
  const mergedBiodataStringHEX = Buffer.from(mergedBiodataString, 'utf8').toString('hex')

  // input data to card
  await AccessBiodataEF(reader, protocol)

  const writeBiodataData = await APDUTransmit(reader, protocol, Command.WRITE_DATA(mergedBiodataLengthHEX, mergedBiodataStringHEX))

  // update field length map value
  const filteredNewDataForFieldLength = Object.keys(filteredNewData).reduce((acc, f) => ({ ...acc, [f]: filteredNewData[f].length.toString(16) }), {})
  const setFiledLengthMap = await FieldLengthMap.SetFieldLengthMap(reader, protocol, filteredNewDataForFieldLength)

  return setFiledLengthMap
}

module.exports = {
  get: GetBiodata,
  set: SetBiodata
}