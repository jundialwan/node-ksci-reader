// @ts-check
/**
 * dataGroups
 * 
 * Object of Data Group
 * One data group consist of one or many data field
 * 
 * Example: Data group BIODATA consist of localCardID data field, institutionCode data field, identityNumber data field, etc
 */
const dataGroups = {
  BIODATA: [
    'localCardID',
    'institutionCode',
    'identityNumber',
    'fullName',
    'organizationUnitCode',
    'institutionName',
    'organizationUnitName',
    'subOrganizationUnitName',
    'role',
    'phone'
  ],
  PRIMARY_ATTRIBUTE: [
    'primaryAttribute'
  ],
  SECONDARY_ATTRIBUTE: [
    'secondaryAttribute'
  ],
  PHOTO: [
    'photo'
  ],
  FINGERPRINT: [
    'fingerprint'
  ],
  ADDRESS: [
    'address',
    'issueDate',
    'expiredDate',
    'email'
  ],
  STATUS: [
    'status'
  ],
  PKI: [
    'privateKey',
    'publicKey',
    'digitalCertificate'
  ],
  RESERVED: [
    'reserved1',
    'reserved2'
  ]
}
module.exports = dataGroups