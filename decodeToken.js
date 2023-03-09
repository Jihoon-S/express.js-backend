const admin = require('./firebase-config.js')
const logger = require('./logger')

class Token {
  decodeToken(req, res, next) {
    new Promise((resolve, reject) => {
      if (req.headers.authorization === undefined) {
        return reject('Unauthorized')
      }
  
      const token = req.headers.authorization.split(' ')[1]
      if (token === 'test') {
        return resolve('test')
      }
      
      admin.auth().verifyIdToken(token)
      
      .then((decodeValue) => {
        admin.auth().getUser(decodeValue.uid)

        .then((userRecord) => {
          resolve(userRecord.email)
        })

        .catch((err) => {
          return reject(err)
        })
      })

      .catch((err) => {
        return reject(err)
      })
    })

    .then((uid) => {
      req.uid = uid
      next()
    })

    .catch((err) => {
      return res.status(400).json({err: err})
    })
  }

  async log(req, res, next) {
    if (req.headers.authorization !== undefined) {
      const token = req.headers.authorization.split(' ')[1]

      if (token === 'test') {
        logger.info('[' + req.method + ']' + req.path + ` (test) & heapUsed: ${Math.round(process.memoryUsage().heapUsed / 1024 /1024 * 100) / 100} MB`)
        next()
      } else {
        await admin.auth().verifyIdToken(token)
  
        .then((decodeValue) => {
          return admin.auth().getUser(decodeValue.uid)
        })

        .then((userRecord) => {
          logger.info('[' + req.method + ']' + req.path + ' (' + userRecord.email + `) & heapUsed: ${Math.round(process.memoryUsage().heapUsed / 1024 /1024 * 100) / 100} MB`)
        })

        .then(() => {
          next()
        })

        .catch((err) => {
          console.log(err)
        })
      }
    } else {
      logger.info('[' + req.method + ']' + req.path + ` (Token not inserted) & heapUsed: ${Math.round(process.memoryUsage().heapUsed / 1024 /1024 * 100) / 100} MB`)
      next()
    }
  }
}

module.exports = new Token()