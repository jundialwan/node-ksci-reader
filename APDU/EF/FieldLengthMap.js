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

const AccessFieldLengthMapEF = async (reader) => await APDUTransmit(reader, [Command.DIR.EF.FIELD_LENGTH_MAP])

async function ResetFieldLengthMap(reader) {
  await MF(reader)
  await DF(reader)
  await AccessFieldLengthMapEF(reader)

  return await APDUTransmit(reader, Command.WRITE_DATA(51, ('0').repeat(102)))
}

async function GetFieldLengthMap (reader) {
  await MF(reader)
  await DF(reader)
  await AccessFieldLengthMapEF(reader)

  // Access Field + Length Map Data
  const accessFieldLengthMapData = await APDUTransmit(reader, Command.READ_DATA(51))
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
 * @param {{[dataKey: string]: string}} newDataKeyAndLength
 */
async function SetFieldLengthMap(reader, newDataKeyAndLength) {
  // get current field length map value
  const FieldLengthMapValue = await GetFieldLengthMap(reader)

  // modified field existence map
  const patchFieldLengthMap = Object.keys(newDataKeyAndLength).reduce((acc, d) => ({ ...acc, [d]: { isExist: true, length: `${('0').repeat(4 - newDataKeyAndLength[d].length)}${newDataKeyAndLength[d].toUpperCase()}` } }), {})
  const newFieldLengthMap = { ...FieldLengthMapValue, ...patchFieldLengthMap }

  const newFieldMapBinary = Object.keys(newFieldLengthMap).reduce((acc, f) => (newFieldLengthMap[f].isExist) ? `${acc}1` : `${acc}0`, '')
  const newFieldMapHEX = `${('0').repeat(6 - parseInt(newFieldMapBinary, 2).toString(16).length)}${parseInt(newFieldMapBinary, 2).toString(16)}`

  // modified length map
  const newLengthMapHEX = Object.keys(newFieldLengthMap).reduce((acc, f) => `${acc}${newFieldLengthMap[f].length.toUpperCase()}`, '')

  // write new field length map value to card
  const newFieldLengthMapHEX = `${newFieldMapHEX}${newLengthMapHEX}`
  console.log('newFieldLengthMapHEX: ', newFieldLengthMapHEX)

  // write to card
  await APDUTransmit(reader, Command.WRITE_DATA(51, newFieldLengthMapHEX))

  return newFieldLengthMap
}

module.exports = {
  ResetFieldLengthMap: ResetFieldLengthMap,
  GetFieldLengthMap: GetFieldLengthMap,
  SetFieldLengthMap: SetFieldLengthMap
}