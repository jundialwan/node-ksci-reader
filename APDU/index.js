const MF = require('./MF')
const DF = require('./DF')
const Command = require('./Command')
const APDUTransmit = require('./APDUTransmit')
const DataStructure = require('./DataStructure')
const FieldLengthMap = require('./EF/FieldLengthMap')

/**
 * Get data from smart card by data group
 * 
 * @param {any} reader Reader object from node-pcsc
 * @param {'BIODATA' | 'PRIMARY_ATTRIBUTE' | 'SECONDARY_ATTRIBUTE' | 'PHOTO' | 'FINGERPRINT' | 'ADDRESS' | 'STATUS' | 'PKI' | 'RESERVED'} dataGroup Data group you want to read
 * @param {'utf8' | 'hex'} dataEncoding data encoding
 * @returns {Promise<{ [dataKey: string]: string }>} Returns data group response in object 
 */
const readDataGroup = async (reader, dataGroup, dataEncoding) => {
  const dataExistenceAndLengthMap = await FieldLengthMap.GetFieldLengthMap(reader)
  console.log(dataExistenceAndLengthMap)

  // Access data group EF
  await APDUTransmit(reader, [Command.DIR.EF[dataGroup]])

  // Data group length
  const dataGroupLength = DataStructure[dataGroup].reduce((acc, b) => dataExistenceAndLengthMap[b].isExist ? acc + parseInt(dataExistenceAndLengthMap[b].length, 16) : acc, 0)

  if (dataGroupLength === 0) {
    // return all empty string-value group data
    return DataStructure[dataGroup].reduce((acc, dataGroupKey) => ({ ...acc, [dataGroupKey]: '' }), {})
  } else {
    const responses = await APDUTransmit(reader, Command.READ_DATA(dataGroupLength))

    // trim response 9000 RFU
    const appendedResult = responses.reduce((acc, r) => `${acc}${r.substring(0, r.length - 4)}`, '')
    const dataGroupKeys = DataStructure[dataGroup]
    const readableGroupData = dataEncoding === 'utf8' ? Buffer.from(appendedResult, 'hex').toString() : appendedResult
    let dataPointer = 0
  
    return dataGroupKeys.reduce((acc, dataKey) => {
      if (dataExistenceAndLengthMap[dataKey].isExist) {
        const dataLength = parseInt(dataExistenceAndLengthMap[dataKey].length, 16)
        const data = readableGroupData.substring(dataPointer, dataPointer + dataLength)
        dataPointer += dataLength

        return { ...acc, [dataKey]: data }
      } else {
        return { ...acc, [dataKey]: '' }
      }
    }, {})
  }
}

/**
 * 
 * @param {any} reader Reader object from pcsc
 * @param {'BIODATA' | 'PRIMARY_ATTRIBUTE' | 'SECONDARY_ATTRIBUTE' | 'PHOTO' | 'FINGERPRINT' | 'ADDRESS' | 'STATUS' | 'PKI' | 'RESERVED'} dataGroup Data group you want to read/write
 * @param {string} dataObject data in object you want to write, optional.
 * @param {'utf8' | 'hex'} dataEncoding data encoding. utf8 or hex.
 * @returns {Promise<{ [dataKey: string]: { isExist: boolean, length: string }}>} New field length map after the data written
 */
const writeDataGroup = async (reader, dataGroup, dataObject, dataEncoding) => {
  // extract data
  const filteredNewData = DataStructure[dataGroup].reduce((acc, dataKey) => dataObject.hasOwnProperty(dataKey) ? ({ ...acc, [dataKey]: dataObject[dataKey] }) : acc, {})

  // Access MF, DF, EF
  await MF(reader)
  await DF(reader)
  await APDUTransmit(reader, [Command.DIR.EF[dataGroup]])

  // current data
  // const currentData = await readDataGroup(reader, protocol, dataGroup, dataEncoding)
  const currentData = {}
  const mergedData = { ...currentData, ...filteredNewData }

  const mergedDataLength = DataStructure[dataGroup].reduce((acc, b) => (mergedData[b] !== null) ? acc + mergedData[b].length : acc, 0)
  const mergedDataString = DataStructure[dataGroup].reduce((acc, b) => (mergedData[b] !== null) ? `${acc}${mergedData[b]}` : acc, '')
  const mergedDataStringHEX = dataEncoding === 'utf8' ? Buffer.from(mergedDataString, 'utf8').toString('hex') : mergedDataString

  // write to card
  await APDUTransmit(reader, Command.WRITE_DATA(mergedDataLength, mergedDataStringHEX))

  // update field length map value
  const filteredNewDataForFieldLength = Object.keys(filteredNewData).reduce((acc, f) => ({ ...acc, [f]: filteredNewData[f].length.toString(16) }), {})
  const setFieldLengthMap = await FieldLengthMap.SetFieldLengthMap(reader, filteredNewDataForFieldLength)

  return setFieldLengthMap
}

module.exports = {
  GetBiodata: async (reader) => readDataGroup(reader, 'BIODATA', 'utf8'),
  WriteBiodata: async (reader, data) => writeDataGroup(reader, 'BIODATA', data, 'utf8'),
  GetPKI: async (reader) => readDataGroup(reader, 'PKI', 'utf8'),
  WritePKI: async (reader, data) => writeDataGroup(reader, 'PKI', data, 'utf8'),
  GetPhoto: async (reader) => readDataGroup(reader, 'PHOTO', 'utf8'),
  WritePhoto: async (reader, data) => writeDataGroup(reader, 'PHOTO', data, 'utf8'),
  GetFingerprint: async (reader) => readDataGroup(reader, 'FINGERPRINT', 'utf8'),
  WriteFingerprint: async (reader, data) => writeDataGroup(reader, 'FINGERPRINT', data, 'utf8'),
  ResetFieldLengthMap: FieldLengthMap.ResetFieldLengthMap
}