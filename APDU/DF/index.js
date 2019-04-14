// @ts-check
const Command = require('../Command')
const APDUTransmit = require('../APDUTransmit')

/**
 * Access DF
 * @param {any} reader 
 * @param {any} protocol 
 * @returns {Promise<string>} APDU Command DF response from card
 */
async function DF (reader, protocol) {
  const response = await APDUTransmit(reader, protocol, [Command.DIR.DF])
  return response[0]
}

module.exports = DF