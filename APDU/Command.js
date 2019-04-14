// @ts-check
const XIRCA = '0002'

const DIR        = '00A400'
const READ_DATA  = '00B0'   // CLA=00 INS=B0 P1=00 P2=00 Lc=00
const WRITE_DATA = '00D0'   // CLA=00 INS=D0 P1=00 P2=00 Lc=00 Le=

const MF = '3F00'
const DF = '1001'

const PREFIX_APDU = `${DIR}${XIRCA}`
const MF_APDU = `${DIR}${XIRCA}${MF}`
const DF_APDU = `${DIR}${XIRCA}${DF}`

const chunkedAPDUCommands = (ins, lengthOfDataInByte, dataInByte) => {
  /**
   * Chunking length by 51
   * 
   * i.e: 
   * 23 -> [23]
   * 51 -> [51]
   * 70 -> [51, 19]
   * 123 -> [51, 51, 21]
   */
  const chunkedDataLength = [ 
    ...([ ...Array(Math.floor(lengthOfDataInByte / 51)) ].map(_ => (51))),
    ...(lengthOfDataInByte !== 51 ? [Math.floor(lengthOfDataInByte % 51)] : [])
  ]
  const chunkedData = dataInByte !== undefined ? ((str) => {
    const r = []
    for(let i = 0; i < str.length; i += 102) { r.push(str.slice(i, i + 102)) }
    return r
  })(dataInByte) : ''

  return chunkedDataLength.map((dl, i) => { 
    // segment counter par 255 byte
    const p1 = `${('0').repeat(2 - Math.floor(i / 5).toString(16).length)}${Math.floor(i / 5).toString(16)}`
    // last index in segment, write 51 byte at once
    const p2 = i === 0 ? '00' : (i * 51).toString(16)
    // segment length
    const lc = dl.toString(16)
    // data
    const data = dataInByte !== undefined ? chunkedData[i] : ''

    return `${ins}${p1}${p2}${lc}${data}`
  })
}

module.exports = {
  DIR: {
    MF: MF_APDU,
    DF: DF_APDU,
    EF: {
      FIELD_LENGTH_MAP:`${PREFIX_APDU}0100`,    //   51 B
      BIODATA:`${PREFIX_APDU}0101`,             //  385 B
      PRIMARY_ATTRIBUTE:`${PREFIX_APDU}0102`,   //   44 B
      SECONDARY_ATTRIBUTE:`${PREFIX_APDU}0103`, //   44 B
      PHOTO:`${PREFIX_APDU}0104`,               // 4096 B
      FINGERPRINT:`${PREFIX_APDU}0105`,         // 4096 B
      ADDRESS:`${PREFIX_APDU}0106`,             //  244 B
      STATUS:`${PREFIX_APDU}0107`,              //    1 B
      PKI:`${PREFIX_APDU}0108`,                 // 6000 B
      RESERVED:`${PREFIX_APDU}0109`             //  256 B
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
  WRITE_DATA: (dataLength, dataHEX) => chunkedAPDUCommands(WRITE_DATA, dataLength, dataHEX)
}