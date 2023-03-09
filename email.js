const express = require('express')
const app = express()
const token = require('./decodeToken')
const Mailjet = require('node-mailjet')
const logger = require('./logger')
require('dotenv').config()

const wrapAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

const mailjet = new Mailjet({
  apiKey: process.env.MJ_APIKEY_PUBLIC,
  apiSecret: process.env.MJ_APIKEY_PRIVATE
})

//Middleware
app.use(token.decodeToken)

/**
 * @swagger
 * paths:
 *  /email/team-invitation:
 *    post:
 *      summary: 팀원 요청 이메일 발송
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: integer
 *                  required: true  
 *                code:
 *                  type: integer
 *                  required: true
 *                nickname:
 *                  type: string
 *                  required: ture
 *                lang:
 *                  type: integer
 *                  required: true
 *                to:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      Email:
 *                        type: string
 *                      Name:
 *                        type: string
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/team-invitation', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, code, nickname, lang, to} = req.body

  let sql = `SELECT title FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: to,
        Subject: lang == 0 ? '팀원 요청 안내입니다.' : 'Member request notice',
        TemplateID: lang == 0 ? 4356301 : lang == 1 ? 4484392 : 4484402, 
        TemplateLanguage: true,
        Variables: {
          "nickname": nickname,
          "title": result[0].title,
          "debateid": debateId, 
          "code": code
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/approve:
 *    post:
 *      summary: 참가 승인 이메일 발송
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: integer
 *                  required: true
 *                lang:
 *                  type: integer
 *                  required: true
 *                ids:
 *                  type: array
 *                  items:
 *                    type: integer
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/approve', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, lang, ids} = req.body

  let sql = `SELECT title, user_name, user_hp, user_email FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  sql = `SELECT email FROM debateuser WHERE id IN(${ids})`
  let emails = await conn.query(sql)

  const to = emails.map((e) => new Object({Email: e.email, Name: lang == 0 ? 'duco.town 회원님' : 'duco.town member'}))
  
  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: to,
        Subject: lang == 0 ? '참가 신청 승인 안내입니다.' : 'Application approval notice.',
        TemplateID: lang == 0 ? 4353197 : lang == 1 ? 4484358 : 4484396,
        TemplateLanguage: true,
        Variables: {
          "title": result[0].title,
          "debateid": debateId, 
          "manager_name": result[0].user_name,
          "manager_mail": result[0].user_email,
          "manager_phone": result[0].user_hp
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/approve-team:
 *    post:
 *      summary: 참가 승인 이메일 발송(팀)
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: integer
 *                  required: true
 *                lang:
 *                  type: integer
 *                  required: true
 *                teamIds:
 *                  type: array
 *                  items:
 *                    type: integer
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/approve-team', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, lang, teamIds} = req.body

  let sql = `SELECT title, user_name, user_hp, user_email FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  sql = `SELECT email FROM debateuser WHERE teamid IN (${teamIds})`
  let emails = await conn.query(sql)

  const to = emails.map((e) => new Object({Email: e.email, Name: lang == 0 ? 'duco.town 회원님' : 'duco.town member'}))
  
  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: to,
        Subject: lang == 0 ? '참가 신청 승인 안내입니다.' : 'Application approval notice',
        TemplateID: lang == 0 ? 4353197 : lang == 1 ? 4484358 : 4484396,
        TemplateLanguage: true,
        Variables: {
          "title": result[0].title,
          "debateid": debateId, 
          "manager_name": result[0].user_name,
          "manager_mail": result[0].user_email,
          "manager_phone": result[0].user_hp
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/refuse:
 *    post:
 *      summary: 참가 거절 이메일 발송
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: integer
 *                  required: true
 *                lang:
 *                  type: integer
 *                  required: true
 *                ids:
 *                  type: object
 *                  properties:
 *                    id: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/refuse', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, lang, ids} = req.body

  let sql = `SELECT title, user_name, user_hp, user_email FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  sql = `SELECT email FROM debateuser WHERE id IN(${ids})`
  let emails = await conn.query(sql)

  const to = emails.map((e) => new Object({Email: e.email, Name: lang == 0 ? 'duco.town 회원님' : 'duco.town member'}))
  
  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: to,
        Subject: lang == 0 ? '참가 신청 거절 안내입니다.' : 'Application denial notice',
        TemplateID: lang == 0 ? 4356298 : lang == 1 ? 4484355 : 4484394,
        TemplateLanguage: true,
        Variables: {
          "title": result[0].title,
          "debateid": debateId, 
          "manager_name": result[0].user_name,
          "manager_mail": result[0].user_email,
          "manager_phone": result[0].user_hp
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/refuse-team:
 *    post:
 *      summary: 참가 거절 이메일 발송(팀)
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: integer
 *                  required: true
 *                lang:
 *                  type: integer
 *                  required: true
 *                teamIds:
 *                  type: object
 *                  properties:
 *                    id: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/refuse-team', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, lang, teamIds} = req.body

  let sql = `SELECT title, user_name, user_hp, user_email FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  sql = `SELECT email FROM debateuser WHERE teamid IN (${teamIds})`
  let emails = conn.query(sql)

  const to = emails.map((e) => new Object({Email: e.email, Name: lang == 0 ? 'duco.town 회원님' : 'duco.town member'}))
  
  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: to,
        Subject: lang == 0 ? '참가 신청 거절 안내입니다.' : 'Application denial notice',
        TemplateID: lang == 0 ? 4356298 : lang == 1 ? 4484355 : 4484394,
        TemplateLanguage: true,
        Variables: {
          "title": result[0].title,
          "debateid": debateId, 
          "manager_name": result[0].user_name,
          "manager_mail": result[0].user_email,
          "manager_phone": result[0].user_hp
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/cancel:
 *    post:
 *      summary: 참가 취소 이메일 발송
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: integer
 *                  required: true
 *                lang:
 *                  type: integer
 *                  required: true
 *                userId:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/cancel', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, lang, userId} = req.body

  let sql = `SELECT title, user_name, user_hp, user_email FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  sql = `SELECT email FROM debateuser WHERE id = ${userId}`
  let email = await conn.query(sql)

  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: [
          {
            Email: email[0].email,
            Name: lang == 0 ? 'duco.town 회원님' : 'duco.town member'
          }
        ],
        Subject: lang == 0 ? '참가 신청 취소 안내입니다.' : 'Application cancellation notice',
        TemplateID: lang == 0 ? 4375417 : lang == 1 ? 4484357 : 4484398,
        TemplateLanguage: true,
        Variables: {
          "title": result[0].title,
          "debateid": debateId, 
          "manager_name": result[0].user_name,
          "manager_mail": result[0].user_email,
          "manager_phone": result[0].user_hp
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/cancel-team:
 *    post:
 *      summary: 참가 취소 이메일 발송(팀)
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: integer
 *                  required: true
 *                lang:
 *                  type: integer
 *                  required: true
 *                teamId:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/cancel-team', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, lang, teamId} = req.body

  let sql = `SELECT title, user_name, user_hp, user_email FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  sql = `SELECT email FROM debateuser WHERE teamid = ${teamId}`
  let emails = conn.query(sql)

  const to = emails.map((e) => new Object({Email: e.email, Name: lang == 0 ? 'duco.town 회원님' : 'duco.town member'}))
  
  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: to,
        Subject: lang == 0 ? '참가 신청 취소 안내입니다.' : 'Application cancellation notice',
        TemplateID: lang == 0 ? 4375417 : lang == 1 ? 4484357 : 4484398,
        TemplateLanguage: true,
        Variables: {
          "title": result[0].title,
          "debateid": debateId, 
          "manager_name": result[0].user_name,
          "manager_mail": result[0].user_email,
          "manager_phone": result[0].user_hp
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/judge-invitation:
 *    post:
 *      summary: 심사위원 요청 이메일 발송
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: integer
 *                  required: true
 *                debateJudgingUserId:
 *                  type: integer
 *                  required: true
 *                lang:
 *                  type: integer
 *                  required: true
 *                email:
 *                  type: string
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/judge-invitation', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, debateJudgingUserId, lang, email} = req.body

  let sql = `SELECT title, user_name, user_hp, user_email FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: [
          {
            Email: email,
            Name: lang == 0 ? 'duco.town 회원님' : 'ducotown member'
          }
        ],
        Subject: lang == 0 ? '심사위원 요청 안내입니다.' : 'Panel member request notice',
        TemplateID: lang == 0 ? 4353120 : lang == 1 ? 4484363 : 4484400,
        TemplateLanguage: true,
        Variables: {
          "title": result[0].title,
          "debateid": debateId,
          "judging_user_id": debateJudgingUserId,
          "manager_name": result[0].user_name,
          "manager_mail": result[0].user_email,
          "manager_phone": result[0].user_hp
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/bracket-open:
 *    post:
 *      summary: 대진표 공개 이메일 발송
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                debateId:
 *                  type: string
 *                  required: true
 *                lang:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/bracket-open', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, lang} = req.body

  let sql = `SELECT title, user_name, user_hp, user_email FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)

  sql = `SELECT email FROM debateuser WHERE debateid = ${debateId} AND status = 2`
  let emails = await conn.query(sql)

  const to = emails.map((e) => new Object({Email: e.email, Name: lang == 0 ? 'duco.town 회원님' : 'duco.town member'}))
  
  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: to,
        Subject: lang == 0 ? '대진표 공개 안내입니다.' : 'Match list notice',
        TemplateID: lang == 0 ? 4356311 : lang == 1 ? 4484356 : 4484395,
        TemplateLanguage: true,
        Variables: {
          "title": result[0].title,
          "debateid": debateId, 
          "manager_name": result[0].user_name,
          "manager_mail": result[0].user_email,
          "manager_phone": result[0].user_hp
        }
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/list/{debateId}:
 *    get:
 *      summary: 이메일 발송 리스트
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          schema:
 *            type: integer
 *        - in: query
 *          name: isParticipants
 *          schema:
 *            type: integer
 *        - in: query
 *          name: isApproved
 *          schema:
 *            type: integer
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  number:
 *                    type: integer
 *                  nickname:
 *                    type: string
 *                  email:
 *                    type: string
 *        "400":
 *          description: error
 */
app.get('/list/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {isParticipants, isApproved} = req.query
  
  let sql = `
    SELECT 
      nickname, email, 
      row_number() OVER(ORDER BY id) AS number
    FROM 
      ${isParticipants == 1 ? 'debateuser' : 'debatejudginguser'}
    WHERE
      debateid = ${debateId}
      ${
        isParticipants == 1 ? 
          isApproved == 0 ? 
            'AND status < 3' 
          : 
            isApproved == 1 ? 
              'AND status = 2' 
            : 
              'AND status = 1' 
        : 
          isApproved == 0 ? 
            'AND status = 0' 
          : 
            isApproved == 1 ? 
              'AND status = 0 AND accept = 1' 
            : 
              'AND status = 0 AND accept = 0'
      }
  `
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /email/send:
 *    post:
 *      summary: 선택된 리스트 이메일 발송
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                subject:
 *                  type: string
 *                text:
 *                  type: string
 *                to:
 *                  type: object
 *                  properties:
 *                    Email:
 *                      type: string
 *                    Name:
 *                      type: string
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/send', wrapAsync(async (req, res) => {
  const {subject, text, to} = req.body

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: to,
        Subject: subject,
        TextPart: text
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/inquiry:
 *    post:
 *      summary: 문의 이메일 발송
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                subject:
 *                  type: string
 *                  required: true
 *                text:
 *                  type: string
 *                  required: true
 *                email:
 *                  type: string
 *                  required: true
 *                nickname:
 *                  type: string
 *                  required: true
 *                field:
 *                  type: integer
 *                  required: true
 *                files:
 *                  type: file
 *                  format: formData
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/inquiry', wrapAsync(async (req, res) => {
  const {subject, text, email, nickname, field} = req.body
  
  const fields = ['토론 참가', '토론 시청', '토론 심사', '토론 개설', '토론 관리', '기타']
  const attachments = []

  if (req.files != null) {
    if (req.files.files.length == undefined) {
      const file = req.files.files
      const fileName = file.name
      const contentType = file.mimetype
      const base64Content = Buffer.from(file.data).toString('base64')
  
      const fileInfo = {
        Filename: fileName,
        ContentType: contentType,
        Base64Content: base64Content
      }
      attachments.push(fileInfo)
      
    } else {
      for (let i = 0; i < req.files.files.length; i++) {
        const file = req.files.files[i]
        const fileName = file.name
        const contentType = file.mimetype
        const base64Content = Buffer.from(file.data).toString('base64')
    
        const fileInfo = {
          Filename: fileName,
          ContentType: contentType,
          Base64Content: base64Content
        }
        attachments.push(fileInfo)
      }
    }
  }

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: [
          {
            Email: 'ducotown@gmail.com',
            Name: 'duco.town 담당자'
          }
        ],
        Subject: subject,
        TemplateID: 4464465,
        TemplateLanguage: true,
        Variables: {
          subject: subject,
          text: text,
          email: email,
          nickname: nickname,
          field: fields[parseInt(field)]
        },
        Attachments: attachments
      }
    ]
  })

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /email/reset-password:
 *    post:
 *      summary: 비밀번호 재설정 이메일 인증
 *      tags: [Email]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                  reqiored: true
 *                lang:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success/ID not exist
 *        "400":
 *          description: error
 */
app.post('/reset-password', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {email, lang} = req.body
  const code = String(Math.floor(Math.random()*1000000)).padStart(6, "0")

  let sql = `
    SELECT COUNT(id) AS count
    FROM user
    WHERE id = '${email}'
  `
  let result = await conn.query(sql)

  if (result[0].count == 0) return res.json({msg: 'ID not exist'})

  mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: 'no-reply@duco.town',
          Name: 'duco.town',
        },
        To: [
          {
            Email: email,
            Name: lang == 0 ? 'duco.town 회원님' : 'duco.town member'
          }
        ],
        Subject: lang == 0 ? '[duco.town] 이메일 인증' : '[duco.town] Email Confirmation',
        TemplateID: lang == 0 ? 4356303 : lang == 1 ? 4484353 : 4484393,
        TemplateLanguage: true,
        Variables: {
          codenumber: code
        }
      }
    ]
  })

  res.json({msg: 'success', code: code})
}))

app.use((err, req, res, next) => {
  console.log(err)
  logger.error(err)
  res.status(500).json({err: err.toString()})
})

module.exports = app
