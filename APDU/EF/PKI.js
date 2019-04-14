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
  // const PKIDataLengthHEX = `${('0').repeat(2 - PKIDataLength.toString(16).length)}${PKIDataLength.toString(16)}`
  // console.log(PKIDataLengthHEX)
  
  const PKIResult = {}

  if (PKIDataLength === 0) {
    DataStructure.PKI.forEach(PKIKey => PKIResult[PKIKey] = null)
  } else {
    // read data to card sequentially
    const readCount = Math.ceil(PKIDataLength / 255) // FF
    const lastPartLength = PKIDataLength % 255
    let readPointer = 0
    const readSequence = []
    let readTotalLength = PKIDataLength

    for (let i = 0; i < readCount; i++, readTotalLength -= 255) {
      if (readTotalLength >= 255) {
        readSequence.push(255)
      } else {
        readSequence.push(lastPartLength)
      }
    }
    console.log('read sequence: ', readSequence)

    let chunkedPKIData = ''

    for (let i = 0; i < readSequence.length; i++) {
      const readLength = readSequence[i]
  
      const commandLength = readLength.toString(16)
      const commandSequence = `${('0').repeat(2 - i.toString(16).length)}${i.toString(16)}`
  
      const command = `00B000${commandSequence}${commandLength}`
      console.log('Chunk command: ', command)
  
      const accessPKIData = await APDUTransmit(reader, protocol, [command])
      
      console.log('Chunk: ', accessPKIData)
      chunkedPKIData = `${chunkedPKIData}${accessPKIData[0].substring(0, accessPKIData.length - 4)}`
  
      readPointer += readLength
    }

    const readablePKIData = Buffer.from(chunkedPKIData, 'hex').toString('utf8')

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
  const mergedPKILengthHEX = mergedPKILength.toString(16)
  const mergedPKIString = DataStructure.PKI.reduce((acc, b) => (mergedPKI[b] !== null) ? `${acc}${mergedPKI[b]}` : acc, '')
  const mergedPKIStringHEX = Buffer.from(mergedPKIString, 'utf8').toString('hex')

  // input data to card
  await AccessPKIEF(reader, protocol)
  
  // write data to card sequentially
  const writeCount = Math.ceil(mergedPKILength / 255) // FF
  const lastPartLength = mergedPKILength % 255
  let writePointer = 0
  const writeSequence = []
  let writeTotalLength = mergedPKILength

  for (let i = 0; i < writeCount; i++, writeTotalLength -= 255) {
    if (writeTotalLength >= 255) {
      writeSequence.push(255)
    } else {
      writeSequence.push(lastPartLength)
    }
  }
  console.log('Write sequence: ', writeSequence)

  for (let i = 0; i < writeSequence.length; i++) {
    const writeLength = writeSequence[i]

    const commandLength = writeLength.toString(16)
    const commandSequence = `${('0').repeat(2 - i.toString(16).length)}${i.toString(16)}`
    const writeChunkData = mergedPKIStringHEX.substring(writePointer, writePointer + writeLength)

    const command = `00D000${commandSequence}${commandLength}${writeChunkData}`
    console.log('Chunk command: ', command)

    const writePKIData = await APDUTransmit(reader, protocol, [command])
    console.log('Chunk: ', writePKIData)

    writePointer += writeLength
  }

  // update field length map value
  const filteredNewDataForFieldLength = Object.keys(filteredNewData).reduce((acc, f) => ({ ...acc, [f]: filteredNewData[f].length.toString(16) }), {})
  const setFiledLengthMap = await FieldLengthMap.SetFieldLengthMap(reader, protocol, filteredNewDataForFieldLength)

  return setFiledLengthMap
}

module.exports = {
  get: GetPKI,
  set: SetPKI
}