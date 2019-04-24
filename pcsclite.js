const pcsc = require('pcsclite')
const app = pcsc()
const APDU = require('./APDU')

const readerSocket = require('socket.io-client')('http://localhost:7777') 

readerSocket.emit('reader ready')

const readers = []

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
        reader.connect({ share_mode: this.SCARD_SHARE_SHARED, protocol: this.SCARD_PROTOCOL_T0 }, async function (err, protocol) {
          if (err) {
            console.log('Error: ', err)
          } else {
            console.log('Protocol(', reader.name, '):', protocol)

            // const Reset = await APDU.ResetFieldLengthMap(reader, protocol)

            // console.log('reset: ', Reset)

            // const Biodata = await APDU.GetBiodata(reader, protocol)

            // console.log('biodata: ', Biodata)

            // const writePKI = await APDU.WritePKI(reader, {
            //   privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIICXQIBAAKBgQDJMkPwvqrnqUiPUCL5/IBq7Vg7ZeloAv60x0CcUzwPzI8dAHUY\nvIcBCDL4lvMYKl+a0vjem3a/7hQhMrZDkCh+jt74ycbsy/NibKtoGxBeeHaEj19k\n5pe8Sd33gGrkYXsGfnLzRnI2GOGWrU/T81qiZ5g96xxKCsmnRdp8EhjA7QIDAQAB\nAoGANOVAM3UNXaaF6xe4elzGLlaEEemzOaM/76tK8052xfiTz54lKwG1xLGxJOYa\nt0m8pOm+gFgDGmavaCL7BDxMSLHpY4aTfm76wAtNZ/Htc85Aq2nXJh+osqBC38cY\njuebZmxe8t7/y6fPt+pK3zHLrR5VxOox8VDiKVwfct77JIkCQQD234q7UQ3w2f18\nWgw2epRdZTJMnn46nna7qto+SENrTIMFWBIAtM2b3mzQOwidFBCu5zUkkXf2lRRW\ndCJ8cavjAkEA0KJtq7NHF1hJexFzrOCWb0ZPKapJu0t1+khj3PLYljm3RVHsrxn+\nBevmd+rnJBKzr6ytXvDfDWiDY8EOk3QY7wJBAMuqojZk6T5haPmVBGxRdmMSoIuL\nWhIcN1Id4sztKwmzZogbH0cL4nCL8HNdsH5+VkElJ7eSd0irtsqYJvdJhAcCQFki\nO9aSNjocBvCkKRZfsQWDNUjorq1s9M9j4/4+ZhfwOoNMF+FLKoKfIQx0eCGqN8hC\n7qLUJ4dT8mZI0ZBfllMCQQDxWptPJTsj0acoi+A8YcwffhbLTnea+NZba2NNYAKF\nQn6qIbTXn29efMINLaV0T7S9YfMQ/qV2rk+yf33Bynl5\n-----END RSA PRIVATE KEY-----',
            //   publicKey: '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDJMkPwvqrnqUiPUCL5/IBq7Vg7\nZeloAv60x0CcUzwPzI8dAHUYvIcBCDL4lvMYKl+a0vjem3a/7hQhMrZDkCh+jt74\nycbsy/NibKtoGxBeeHaEj19k5pe8Sd33gGrkYXsGfnLzRnI2GOGWrU/T81qiZ5g9\n6xxKCsmnRdp8EhjA7QIDAQAB\n-----END PUBLIC KEY-----',
            //   digitalCertificate: '-----BEGIN CERTIFICATE-----\nMIIFtTCCA52gAwIBAgIJAO0cq2lJPZZJMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV\nBAYTAkFVMRMwEQYDVQQIEwpTb21lLVN0YXRlMSEwHwYDVQQKExhJbnRlcm5ldCBX\naWRnaXRzIFB0eSBMdGQwHhcNMTQwMzEyMTc0NzU5WhcNMTkwMzEyMTc0NzU5WjBF\nMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50\nZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIIC\nCgKCAgEAsgzs6vN2sveHVraXV0zdoVyhWUHWNQ0xnhHTPhjt5ggHmSvrUxvUpXfK\nWCP9gZo59Q7dx0ydjqBsdooXComVP4kGDjulvOHWgvcVmwTsL0bAMqmsCyyJKM6J\nWqi8E+CPTOpMBWdapUxvwaSmop8geiTtnX0aV4zGXwsz2mwdogbounQjMB/Ew7vv\n8XtqwXSpnR7kM5HPfM7wb9F8MjlRuna6Nt2V7i0oUr+EEt6fIYEVZFiHTSUzDLaz\n2eClJeCNdvyqaeGCCqs+LunMq3kZjO9ahtS2+1qZxfBzac/0KXRYnLa0kGQHZbw0\necgdZC9YpqqMeTeSnJPPX4/TQt54qVLQXM3+h8xvwt3lItcJPZR0v+0yQe5QEwPL\n4c5UF81jfGrYfEzmGth6KRImRMdFLF9+F7ozAgGqCLQt3eV2YMXIBYfZS9L/lO/Q\n3m4MGARZXUE3jlkcfFlcbnA0uwMBSjdNUsw4zHjVwk6aG5CwYFYVHG9n5v4qCxKV\nENRinzgGRnwkNyADecvbcQ30/UOuhU5YBnfFSYrrhq/fyCbpneuxk2EouL3pk/GA\n7mGzqhjPYzaaNGVZ8n+Yys0kxuP9XDOUEDkjXpa/SzeZEk9FXMlLc7Wydj/7ES4r\n6SYCs4KMr+p7CjFg/a7IdepLQ3txrZecrBxoG5mBDYgCJCfLBu0CAwEAAaOBpzCB\npDAdBgNVHQ4EFgQUWQI/JOoU+RrUPUED63dMfd2JMFkwdQYDVR0jBG4wbIAUWQI/\nJOoU+RrUPUED63dMfd2JMFmhSaRHMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIEwpT\nb21lLVN0YXRlMSEwHwYDVQQKExhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGSCCQDt\nHKtpST2WSTAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEBBQUAA4ICAQBwGbAmiLHE\njubdLeMygwrV8VjlOVxV41wvRi6y1B5Bdvh71HPoOZdvuiZOogzxB22Tzon6Uv5q\n8uuAy37rHLlQTOqLwdLJOu/ijMirAkh13gQWt4oZGUDikyiI4PMNo/hr6XoZWUfU\nfwmcAzoEMln8HyISluTau1mtQIDgvGprU472GqC4AC7bYeED+ChCevc7Ytjl4zte\n/tw8u3nqrkESYBIA2yEgyFAr1pRwJPM/T1U6Ehalp1ZTeQcAXEa7IC6ht2NlN1FC\nfk2KQmrk4Z3jaSVv8GxshA354W+UEpti0o6Fv+2ozkAaQ1/xjiNwBTHtgJ1/AG1j\nbDYcCFfmYmND0RFjvVu7ma+UNdKQ+t1o7ip4tHQUTEFvdqoaCLN09PcTVgvm71Lr\ns8IOldiMgiCjQK3e0jwXx78tXs/msMzVI+9AR9aNzo0Y42C97ctlGu3+v07Zp+x4\n6w1rg3eklJM02davNWK2EUSetn9EWsIJXU34Bj7mnI/2DFo292GVNw1kT5Bf4IvA\nT74gsJLB6wacN4Ue6zPtIvrK93DABAfRUmrAWmH8+7MJolSC/rabJF3E2CeBTYqZ\nR5M5azDV1CIhIeOTiPA/mq5fL1UrgVbB+IATIsUAQfuWivDyoeu96LB/QswyHAWG\n8k2fPbA2QVWJpcnryesCy3qtzwbHSYbshQ==\n-----END CERTIFICATE-----'
            // })

            // console.log('write PKI: ', writePKI)

            // const PKI = await APDU.GetPKI(reader, protocol)

            // console.log('PKI: ', PKI)

            // readerSocket.emit(`${readname} inserted`, Biodata)

            // const writeBiodata = await APDU.WriteBiodata(reader, {
            //   localCardID: 'MHS0000000010',
            //   institutionCode: '001002',
            //   identityNumber: '1299000371',
            //   fullName: 'Jundi Jundi Jundi Jundi Jundi Jundi Jundi Jundi Jundi Jundi JUndi JUndi jiunid jundi judni jinud junid jinud jindu jundi jindu jnidu yes yuhu',
            //   organizationUnitCode: '01.00.12.01',
            //   institutionName: 'UNIVERSITAS INDONESIA',
            //   organizationUnitName: 'FAKULTAS ILMU KOMPUTER',
            //   subOrganizationUnitName: 'PROGRAM STUDI ILMU KOMPUTER',
            //   role: '0',
            //   phone: '628178901234'
            // })

            // console.log('write biodata: ', writeBiodata)

            // const Biodata2 = await APDU.GetBiodata(reader)

            // console.log('biodata: ', Biodata2)

            // const writePhoto = await APDU.WritePhoto(reader, {
            //   photo: '-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,8466D8EFECB9989F1B3EF93838A2EECF\n\n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\n-----END RSA PRIVATE KEY-----\n'
            // })

            // console.log('write photo: ', writePhoto)

            const photo = await APDU.GetPhoto(reader)
            console.log('photo: ', photo)

            // const writeFingerprint = await APDU.WriteFingerprint(reader, {
            //   fingerprint: '-----BEGIN CERTIFICATE-----\nMIIFtTCCA52gAwIBAgIJAO0cq2lJPZZJMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV\nBAYTAkFVMRMwEQYDVQQIEwpTb21lLVN0YXRlMSEwHwYDVQQKExhJbnRlcm5ldCBX\naWRnaXRzIFB0eSBMdGQwHhcNMTQwMzEyMTc0NzU5WhcNMTkwMzEyMTc0NzU5WjBF\nMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50\nZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIIC\nCgKCAgEAsgzs6vN2sveHVraXV0zdoVyhWUHWNQ0xnhHTPhjt5ggHmSvrUxvUpXfK\nWCP9gZo59Q7dx0ydjqBsdooXComVP4kGDjulvOHWgvcVmwTsL0bAMqmsCyyJKM6J\nWqi8E+CPTOpMBWdapUxvwaSmop8geiTtnX0aV4zGXwsz2mwdogbounQjMB/Ew7vv\n8XtqwXSpnR7kM5HPfM7wb9F8MjlRuna6Nt2V7i0oUr+EEt6fIYEVZFiHTSUzDLaz\n2eClJeCNdvyqaeGCCqs+LunMq3kZjO9ahtS2+1qZxfBzac/0KXRYnLa0kGQHZbw0\necgdZC9YpqqMeTeSnJPPX4/TQt54qVLQXM3+h8xvwt3lItcJPZR0v+0yQe5QEwPL\n4c5UF81jfGrYfEzmGth6KRImRMdFLF9+F7ozAgGqCLQt3eV2YMXIBYfZS9L/lO/Q\n3m4MGARZXUE3jlkcfFlcbnA0uwMBSjdNUsw4zHjVwk6aG5CwYFYVHG9n5v4qCxKV\nENRinzgGRnwkNyADecvbcQ30/UOuhU5YBnfFSYrrhq/fyCbpneuxk2EouL3pk/GA\n7mGzqhjPYzaaNGVZ8n+Yys0kxuP9XDOUEDkjXpa/SzeZEk9FXMlLc7Wydj/7ES4r\n6SYCs4KMr+p7CjFg/a7IdepLQ3txrZecrBxoG5mBDYgCJCfLBu0CAwEAAaOBpzCB\npDAdBgNVHQ4EFgQUWQI/JOoU+RrUPUED63dMfd2JMFkwdQYDVR0jBG4wbIAUWQI/\nJOoU+RrUPUED63dMfd2JMFmhSaRHMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIEwpT\nb21lLVN0YXRlMSEwHwYDVQQKExhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGSCCQDt\nHKtpST2WSTAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEBBQUAA4ICAQBwGbAmiLHE\njubdLeMygwrV8VjlOVxV41wvRi6y1B5Bdvh71HPoOZdvuiZOogzxB22Tzon6Uv5q\n8uuAy37rHLlQTOqLwdLJOu/ijMirAkh13gQWt4oZGUDikyiI4PMNo/hr6XoZWUfU\nfwmcAzoEMln8HyISluTau1mtQIDgvGprU472GqC4AC7bYeED+ChCevc7Ytjl4zte\n/tw8u3nqrkESYBIA2yEgyFAr1pRwJPM/T1U6Ehalp1ZTeQcAXEa7IC6ht2NlN1FC\nfk2KQmrk4Z3jaSVv8GxshA354W+UEpti0o6Fv+2ozkAaQ1/xjiNwBTHtgJ1/AG1j\nbDYcCFfmYmND0RFjvVu7ma+UNdKQ+t1o7ip4tHQUTEFvdqoaCLN09PcTVgvm71Lr\ns8IOldiMgiCjQK3e0jwXx78tXs/msMzVI+9AR9aNzo0Y42C97ctlGu3+v07Zp+x4\n6w1rg3eklJM02davNWK2EUSetn9EWsIJXU34Bj7mnI/2DFo292GVNw1kT5Bf4IvA\nT74gsJLB6wacN4Ue6zPtIvrK93DABAfRUmrAWmH8+7MJolSC/rabJF3E2CeBTYqZ\nR5M5azDV1CIhIeOTiPA/mq5fL1UrgVbB+IATIsUAQfuWivDyoeu96LB/QswyHAWG\n8k2fPbA2QVWJpcnryesCy3qtzwbHSYbshQ==\n-----END CERTIFICATE-----\n'
            // })

            // console.log('write fingerprint: ', writeFingerprint)

            const fingerprint = await APDU.GetFingerprint(reader)
            console.log('fingerprint: ', fingerprint)

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