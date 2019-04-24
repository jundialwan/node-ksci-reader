/**
 * Transmit APDU Command to reader and card. Return Promise
 * @param {any} reader 
 * @param {string[]} APDUCommands Array of HEX string of APDU Command
 * @returns {Promise<string[]>} Array of APDU Command response in HEX
 */
const APDUTransmit = async (reader, APDUCommands) => {
  /**
   * @type {string[]} Array of APDU Command response in HEX
   */
  const responses = []
  const T0 = 0x0001
  console.log('Ready to transmit: ', APDUCommands)

  for (let i = 0; i < APDUCommands.length; i++) {
    const APDUCommand = APDUCommands[i]
    
    const response = await new Promise((rs, rj) => {
      console.log('APDU Command: ', APDUCommand)
      reader.transmit(Buffer.from(APDUCommand, 'hex'), 255 + 2, T0, function (err, data) {
        if (err) {
          console.log('Error APDU Command: ', err)
          rj('0')
        } else {
          console.log('APDU Command response: ', data.toString('hex'))
          rs(data.toString('hex'))
        }
      })  
    })

    responses.push(response)
  }

  return responses
}

module.exports = APDUTransmit