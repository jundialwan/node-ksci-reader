const XIRCA = '0002'

const DIR        = '00A400'
const READ_DATA  = '00B0'   // CLA=00 INS=B0 P1=00 P2=00 Lc=00
const WRITE_DATA = '00D0'   // CLA=00 INS=D0 P1=00 P2=00 Lc=00 Le=

const MF = '3F00'
const DF = '1001'

const PREFIX_APDU = `${DIR}${XIRCA}`
const MF_APDU = `${DIR}${XIRCA}${MF}`
const DF_APDU = `${DIR}${XIRCA}${DF}`

const dataLengthAPDUOrder = dataLength => {
  const FFSegment = Math.floor(dataLength / 255)
  const remainderSegment = dataLength % 255

  const FFSegmentSeq = [...Array(FFSegment)].map(_ => 255)
  const remainderSegmentSeq = remainderSegment === 0 ? [] : [remainderSegment]

  return [...FFSegmentSeq, ...remainderSegmentSeq]
}

const chunkDataByDataLengthAPDUOrder = (data, dataLengthAPDUOrder) => {
  let latestEnd = 0
  return dataLengthAPDUOrder.reduce((acc, dl) => {
    const singleDataAPDU = [...acc, data.slice(latestEnd, latestEnd + (dl * 2))]
    latestEnd += dl * 2
    return singleDataAPDU
  }, [])
}

const chunkedAPDUCommands = (ins, lengthOfDataInByte, dataInByte) => {
  const chunkedDataLength = dataLengthAPDUOrder(lengthOfDataInByte)
  const chunkedData = dataInByte !== undefined ? chunkDataByDataLengthAPDUOrder(dataInByte, chunkedDataLength) : ''

  return ((data, dataLength) => {
    let latestIndex = 0
  
    return dataLength.reduce((acc, dl, i) => {
      const p1p2 = ('0').repeat(4 - latestIndex.toString(16).length) + latestIndex.toString(16)
      const d = data === '' ? '' : data[i]
      const apduCommand = `${ins}${p1p2}${('0').repeat(2 - dl.toString(16).length)}${dl.toString(16)}${d}`
      
      latestIndex += dl
  
      return [...acc, apduCommand]
    }, [])
  })(chunkedData, chunkedDataLength)
}

module.exports = {
  DIR: {
    MF: MF_APDU,
    DF: DF_APDU,
    EF: {
      FIELD_LENGTH_MAP:`${PREFIX_APDU}0100`,    //   51 B: 0033
      BIODATA:`${PREFIX_APDU}0101`,             //  385 B: 0181 = ---real--->  334 B
      PRIMARY_ATTRIBUTE:`${PREFIX_APDU}0102`,   //   44 B: 002c
      SECONDARY_ATTRIBUTE:`${PREFIX_APDU}0103`, //   44 B: 002c
      PHOTO:`${PREFIX_APDU}0104`,               // 4096 B: 1000
      FINGERPRINT:`${PREFIX_APDU}0105`,         // 4096 B: 1000
      ADDRESS:`${PREFIX_APDU}0106`,             //  244 B: 00f4 = ---real--->  238 B
      STATUS:`${PREFIX_APDU}0107`,              //    1 B: 0001
      PKI:`${PREFIX_APDU}0108`,                 // 6000 B: 1770 = ---real--->   99 B
      RESERVED:`${PREFIX_APDU}0109`             //  256 B: 0100 --------------------> File 0109 not found
    }
  },
  /**
   * Generate Read Command
   * 
   * @param {number} dataLength number represent length of the data which will be read from card
   * @returns {string[]} Array of APDU Commands, ready to be transmitted
   */
  READ_DATA: (dataLength) => {
    console.log('READ_DATA length: ', dataLength)
    return chunkedAPDUCommands(READ_DATA, dataLength)
  },
  /**
   * Generate Write Command
   * 
   * @param {number} dataLength number represent length of dataHEX which will be written to card
   * @param {string} dataHEX HEX string representation of the data will be written to card
   * @returns {string[]} Array of APDU Commands, ready to be transmitted
   */
  WRITE_DATA: (dataLength, dataHEX) => {
    console.log('WRITE DATA LENGTH: ', dataLength)
    return chunkedAPDUCommands(WRITE_DATA, dataLength, dataHEX)
  }
}