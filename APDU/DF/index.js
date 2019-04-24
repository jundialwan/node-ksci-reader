const Command = require('../Command')
const APDUTransmit = require('../APDUTransmit')

/**
 * Access DF
 * @param {any} reader
 * @returns {Promise<string>} APDU Command DF response from card
 */
async function DF (reader) {
  const response = await APDUTransmit(reader, [Command.DIR.DF])
  return response[0]
}

module.exports = DF