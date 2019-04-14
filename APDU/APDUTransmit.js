// @ts-check
/**
 * Transmit APDU Command to reader and card. Return Promise
 * @param {any} reader 
 * @param {any} protocol 
 * @param {string[]} APDUCommands Array of HEX string of APDU Command
 * @returns {Promise<string[]>} Array of APDU Command response in HEX
 */
const APDUTransmit = async (reader, protocol, APDUCommands) => {
  /**
   * @type {string[]} Array of APDU Command response in HEX
   */
  const responses = []
  console.log('Ready to transmit: ', APDUCommands)

  for (let i = 0; i < APDUCommands.length; i++) {
    const APDUCommand = APDUCommands[i]
    
    const response = await new Promise((rs, rj) => {
      console.log('APDU Command: ', APDUCommand)
      reader.transmit(Buffer.from(APDUCommand, 'hex'), 51 + 2, protocol, function (err, data) {
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