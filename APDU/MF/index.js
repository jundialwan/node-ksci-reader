// @ts-check
const Command = require('../Command')
const APDUTransmit = require('../APDUTransmit')

/**
 * Access MF, root master directory
 * @param {any} reader
 * @returns {Promise<string>} APDU Command MF response
 */
async function MF (reader) {
  const response = await APDUTransmit(reader, [Command.DIR.MF])
  return response[0]
}

module.exports = MF