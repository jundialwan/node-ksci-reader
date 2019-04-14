// @ts-check
const Command = require('../Command')
const MF = require('../MF')
const DF = require('../DF')
const APDUTransmit = require('../APDUTransmit')
const HexToBinary = require('../../HexToBinary')

const SCDataExistenceAndLength = {
  localCardID: { isExist: false, length: '0000' },             //   32 B
  institutionCode: { isExist: false, length: '0000' },         //   32 B
  identityNumber: { isExist: false, length: '0000' },          //   32 B
  fullName: { isExist: false, length: '0000' },                //   64 B
  organizationUnitCode: { isExist: false, length: '0000' },    //   32 B
  institutionName: { isExist: false, length: '0000' },         //   64 B
  organizationUnitName: { isExist: false, length: '0000' },    //   48 B
  subOrganizationUnitName: { isExist: false, length: '0000' }, //   48 B
  role: { isExist: false, length: '0000' },                    //    1 B
  phone: { isExist: false, length: '0000' },                   //   32 B
  primaryAttribute: { isExist: false, length: '0000' },        //   44 B
  secondaryAttribute: { isExist: false, length: '0000' },      //   44 B
  photo: { isExist: false, length: '0000' },                   // 4096 B
  fingerprint: { isExist: false, length: '0000' },             // 4096 B
  address: { isExist: false, length: '0000' },                 //  200 B
  issueDate: { isExist: false, length: '0000' },               //    6 B
  expiredDate: { isExist: false, length: '0000' },             //    6 B
  email: { isExist: false, length: '0000' },                   //   32 B
  status: { isExist: false, length: '0000' },                  //    1 B
  privateKey: { isExist: false, length: '0000' },              // 2000 B
  publicKey: { isExist: false, length: '0000' },               // 2000 B
  digitalCertificate: { isExist: false, length: '0000' },      // 2000 B
  reserved1: { isExist: false, length: '0000' },               //  100 B
  reserved2: { isExist: false, length: '0000' }                //  100 B
}
const SCDataKeys = Object.keys(SCDataExistenceAndLength)

const AccessFieldLengthMapEF = async (reader, protocol) => await APDUTransmit(reader, protocol, [Command.DIR.EF.FIELD_LENGTH_MAP])

async function ResetFieldLengthMap(reader, protocol) {
  const accessMF = await MF(reader, protocol)
  const accessDF = await DF(reader, protocol)

  const defaultValue = ('0').repeat(102)
  const accessFieldLengthMapEF = await AccessFieldLengthMapEF(reader, protocol)
  const resetFieldLengthMap = await APDUTransmit(reader, protocol, Command.WRITE_DATA(51, defaultValue))

  return resetFieldLengthMap
}

async function GetFieldLengthMap (reader, protocol) {
  const accessMF = await MF(reader, protocol)
  const accessDF = await DF(reader, protocol)
  const accessFieldLengthMapEF = await AccessFieldLengthMapEF(reader, protocol)

  // Access Field + Length Map Data
  // const dataLengthHEX = accessFieldLengthMapEF.substring(accessFieldLengthMapEF.length - 2)
  // const dataLength = parseInt(dataLengthHEX, 16)
  const accessFieldLengthMapData = await APDUTransmit(reader, protocol, Command.READ_DATA(51))
  console.log('FieldLengthMap: ', accessFieldLengthMapData)
  const response = accessFieldLengthMapData[0]

  // data existence: byte 1 - 3
  // data length: byte 4 - 51, @2 bytes
  const dataExistenceMap = response.substring(0, 6)
  const dataLengthMap = response.substring(6, response.length - 4)
  let dataLengthPointer = 0

  HexToBinary(dataExistenceMap).split('').forEach((de, i) => {
    if (de === '1') {
      const parsedDataExistenceAndLength = {
        isExist: true,
        length: dataLengthMap.substring(dataLengthPointer, dataLengthPointer + 4)
      }

      SCDataExistenceAndLength[SCDataKeys[i]] = parsedDataExistenceAndLength
    } else {
      SCDataExistenceAndLength[SCDataKeys[i]] = { isExist: false, length: '0000' }
    }

    dataLengthPointer += 4
  })
  dataLengthPointer = 0

  return SCDataExistenceAndLength
}

/**
 * @param {any} reader 
 * @param {any} protocol 
 * @param {{[dataKey: string]: string}} newDataKeyAndLength
 */
async function SetFieldLengthMap(reader, protocol, newDataKeyAndLength) {
  // get current field length map value
  const FieldLengthMapValue = await GetFieldLengthMap(reader, protocol)

  // modified field existence map
  const patchFieldLengthMap = {}
  Object.keys(newDataKeyAndLength).forEach(d => {
    patchFieldLengthMap[d] = { isExist: true, length: `${('0').repeat(4 - newDataKeyAndLength[d].length)}${newDataKeyAndLength[d].toUpperCase()}` }
  })
  const newFieldLengthMap = { ...FieldLengthMapValue, ...patchFieldLengthMap }

  const newFieldMapBinary = Object.keys(newFieldLengthMap).reduce((acc, f) => (newFieldLengthMap[f].isExist) ? `${acc}1` : `${acc}0`, '')
  const newFieldMapHEX = `${('0').repeat(6 - parseInt(newFieldMapBinary, 2).toString(16).length)}${parseInt(newFieldMapBinary, 2).toString(16)}`

  // modified length map
  const newLengthMapHEX = Object.keys(newFieldLengthMap).reduce((acc, f) => `${acc}${newFieldLengthMap[f].length.toUpperCase()}`, '')

  // write new field length map value to card
  const newFieldLengthMapValue = `${newFieldMapHEX}${newLengthMapHEX}`
  console.log('newFieldMapBinary: ', newFieldMapBinary)
  console.log('newFieldMapHEX :', newFieldMapHEX)
  console.log('newFieldMapHEX.length: ', newFieldMapHEX.length)
  const newFieldLengthMapValueLengthHEX = `${('0').repeat(2 - newFieldLengthMapValue.length.toString(16).length)}${newFieldLengthMapValue.length.toString(16)}`

  const accessMF = await MF(reader, protocol)
  const accessDF = await DF(reader, protocol)
  const accessFieldLengthMapEF = await AccessFieldLengthMapEF(reader, protocol)
  const writeFieldLengthMap = await APDUTransmit(reader, protocol, Command.WRITE_DATA(51, newFieldLengthMapValue))

  return writeFieldLengthMap
}

module.exports = {
  ResetFieldLengthMap: ResetFieldLengthMap,
  GetFieldLengthMap: GetFieldLengthMap,
  SetFieldLengthMap: SetFieldLengthMap
}