// @ts-check
const Command = require('../Command')
const APDUTransmit = require('../APDUTransmit')

/**
 * Access MF, root master directory
 * @param {any} reader
 * @param {any} protocol
 * @returns {Promise<string>} APDU Command MF response
 */
async function MF (reader, protocol) {
  const response = await APDUTransmit(reader, protocol, [Command.DIR.MF])
  return response[0]
}

module.exports = MF