// @ts-check
const pcsc = require('pcsclite')
const app = pcsc()
const APDU = require('./APDU')

const readerSocket = require('socket.io-client')('http://localhost:7777') 

readerSocket.emit('reader ready')

const readers = []

const XIRCA = '0002'

const DIR_ACCESS  = '00A400'
const DATA_ACCESS = '00B00000'

const MF_APDU = '3F00'
const DF_APDU = '1001'

const EF_APDU = {
  FIELD_LENGTH_MAP:'0100',    //   51 B
  BIODATA:'0101',             //  385 B
  PRIMARY_ATTRIBUTE:'0102',   //   44 B
  SECONDARY_ATTRIBUTE:'0103', //   44 B
  PHOTO:'0104',               // 4096 B
  FINGERPRINT:'0105',         // 4096 B
  ADDRESS:'0106',             //  244 B
  STATUS:'0107',              //    1 B
  PKI:'0108',                 // 6000 B
  RESERVED:'0109'             //  256 B
}

const SCDataAccess = {
  BIODATA: {
    localCardID: null,
    institutionCode: null,
    identityNumber: null,
    fullName: null,
    organizationUnitCode: null,
    institutionName: null,
    organizationUnitName: null,
    subOrganizationUnitName: null,
    role: null,
    phone: null
  },
  PRIMARY_ATTRIBUTE: {
    primaryAttribute: null
  },
  SECONDARY_ATTRIBUTE: {
    secondaryAttribute: null
  },
  PHOTO: {
    photo: null
  },
  FINGERPRINT: {
    fingerprint: null
  },
  ADDRESS: {
    address: null,
    issueDate: null,
    expiredDate: null,
    email: null
  },
  STATUS: {
    status: null
  },
  PKI: {
    privateKey: null,
    publicKey: null,
    digitalCertificate: null
  },
  RESERVED: {
    reserved1: null,
    reserved2: null
  }
}

const SCDataExistenceAndLength = {
  localCardID: { isExist: false, length: '00' },             //   32 B
  institutionCode: { isExist: false, length: '00' },         //   32 B
  identityNumber: { isExist: false, length: '00' },          //   32 B
  fullName: { isExist: false, length: '00' },                //   64 B
  organizationUnitCode: { isExist: false, length: '00' },    //   32 B
  institutionName: { isExist: false, length: '00' },         //   64 B
  organizationUnitName: { isExist: false, length: '00' },    //   48 B
  subOrganizationUnitName: { isExist: false, length: '00' }, //   48 B
  role: { isExist: false, length: '00' },                    //    1 B
  phone: { isExist: false, length: '00' },                   //   32 B
  primaryAttribute: { isExist: false, length: '00' },        //   44 B
  secondaryAttribute: { isExist: false, length: '00' },      //   44 B
  photo: { isExist: false, length: '00' },                   // 4096 B
  fingerprint: { isExist: false, length: '00' },             // 4096 B
  address: { isExist: false, length: '00' },                 //  200 B
  issueDate: { isExist: false, length: '00' },               //    6 B
  expiredDate: { isExist: false, length: '00' },             //    6 B
  email: { isExist: false, length: '00' },                   //   32 B
  status: { isExist: false, length: '00' },                  //    1 B
  privateKey: { isExist: false, length: '00' },              // 2000 B
  publicKey: { isExist: false, length: '00' },               // 2000 B
  digitalCertificate: { isExist: false, length: '00' },      // 2000 B
  reserved1: { isExist: false, length: '00' },               //  100 B
  reserved2: { isExist: false, length: '00' }                //  100 B
}
const SCDataKeys = Object.keys(SCDataExistenceAndLength)

app.on('reader', async (reader) => {
  console.log('New reader detected', reader.name)
  readers.push(reader)

  reader.on('error', function (err) {
    console.log('Error(', this.name, '):', err.message)
  })

  reader.on('status', async function (status) {
    console.log('Status(', this.name, '):', status)
    /* check what has changed */
    var changes = this.state ^ status.state
    if (changes) {
      if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
        console.log("card removed")/* card removed */
        reader.disconnect(reader.SCARD_LEAVE_CARD, function (err) {
          if (err) {
            console.log(err)
          } else {
            console.log('Disconnected')

            readerSocket.emit(`${reader.name} removed`)
          }
        })
      } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {
        console.log("card inserted")/* card inserted */
        reader.connect({ share_mode: this.SCARD_SHARE_SHARED }, async function (err, protocol) {
          if (err) {
            console.log('Error: ', err)
          } else {
            console.log('Protocol(', reader.name, '):', protocol)

            // const Reset = await APDU.ResetFieldLengthMap(reader, protocol)

            // console.log('reset: ', Reset)

            const Biodata = await APDU.GetBiodata(reader, protocol)

            console.log('biodata: ', Biodata)

            // const writePKI = await APDU.WritePKI(reader, protocol, {
            //   privateKey: '-----BEGIN RSA PRIVATE KEY-----\n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\n-----END RSA PRIVATE KEY-----\n',
            //   publicKey: '-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAx3FZYD81G1080k+G4vSz\nYFySudzmlopH3abLYGy3NSymBWCdQm0d8e5SmYQKFfCsoBkbiEGi11PDWXrBF4sO\ng2F37TIGgF+4u8/nb0jNRFtjIZ7TIwD3UgZDrWfUsQzDgNcKh1SBtK1EyE27lzdI\nwnnekdEY41n85PY+ttcnCWNQo90CVbDt/InnJJ84K3m+SvDOhMQ+UugWGo8JsMtw\nJj7S38MdZabG5YMTojn/meICs+p6qT5UTG65+AEOa9OUxu0R+iPBgYFyHXkyAZVQ\n7eYzOoZuExWT46PfQhQ4O2/03iqnT8hOIRU0J84urNS5GUnzNUuSISmqOJC/VIdG\n/aMAawAf9EHB2jBBWgYuMhIxHIFiyIZjtw9xxN/9evTDNMBCIYAxh/lof0/4kvDy\nO1JOC+U/17frLvI75KZSGnZOLmj5Sp0r5m0666wmRCd1y9jqWtWx/KnF+bZewz+Y\nJezQh4RXmaWXbF7D/Ku5LVAiEzCgwCQmWCoLAbW7g5yigmk1mwtd9uBy0clCB5z1\nIB4oRuX1Gy+nXq5iQVTNVZUKInqtaWucU30wMOkJWckelAA/CuaHh/j3FqRzEbFt\nvjqA5F8qPHJ13UiLa4mbFXwI0hVN55gEisXebcQnHug9viSLftFSm4p6645uOsln\nmpIInFeIaTwM0PDiyz8bqwcCAwEAAQ==\n-----END PUBLIC KEY-----\n',
            //   digitalCertificate: '-----BEGIN CERTIFICATE-----\n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\n-----END CERTIFICATE-----\n'
            // })

            // console.log('write PKI: ', writePKI)

            // const PKI = await APDU.GetPKI(reader, protocol)

            // console.log('PKI: ', PKI)

            // readerSocket.emit(`${readname} inserted`, Biodata)

            // const writeBiodata = await APDU.WriteBiodata(reader, protocol, {
            //   localCardID: 'MHS0000000010',
            //   institutionCode: '001002',
            //   identityNumber: '1299000371',
            //   fullName: 'Gladhi Guarddin',
            //   organizationUnitCode: '01.00.12.01',
            //   institutionName: 'UNIVERSITAS INDONESIA',
            //   organizationUnitName: 'FAKULTAS ILMU KOMPUTER',
            //   subOrganizationUnitName: 'PROGRAM STUDI ILMU KOMPUTER',
            //   role: '0',
            //   phone: '628178901234'
            // })

            // console.log('write biodata: ', writeBiodata)

            // const Biodata2 = await APDU.GetBiodata(reader, protocol)

            // console.log('biodata: ', Biodata2)

            // reader.close()
            // app.close()
          }
        })
      }
    }
  })

  reader.on('end', function () {
    console.log('Reader', this.name, 'removed')
  })
})

app.on('error', function(err) {
  console.log('PCSC error', err.message)
})

// console.log(readers)

// const mainReader = readers.filter(r => r.name === 'ACS ACR1281 1S Dual Reader 00 00')[0]
// console.log('Main reader: ', mainReader)