const express = require('express')
const app = express()
const token = require('./decodeToken')
const logger = require('./logger')

const wrapAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

/** 
 * @swagger
 * components:
 *  schemas:
 *    User:
 *      type: object
 *      properties:
 *        id:
 *          type: string
 *          description: ID
 *        email:
 *          type: string
 *          description: 이메일
 *        email_cert:
 *          type: integer
 *          description: 이메일 인증 0:미인증/1:인증
 *        nickname:
 *          type: string
 *          description: 닉네임
 *        name:
 *          type: string
 *          description: 이름
 *        gender:
 *          type: integer
 *          description: 성별 0:미상/1:남성/2:여성
 *        company:
 *          type: string
 *          description: 소속
 *        nationality:
 *          type: string
 *          description: 국적
 *        imgpath:
 *          type: string
 *          description: 프로필 사진
 *        notice:
 *          type: integer
 *          description: 알림 수신 0:허용/1:불허
 *        unityloginstate:
 *          type: string
 *        unitychargender:
 *          type: string
 *        unitycharskincolor:
 *          type: string
 *        unitycharhairstyle:
 *          type: integer
 *        unitycharhaircolor:
 *          type: string
 *        unityshirts:
 *          type: string
 *        unitypants:
 *          type: string
 *        unitynickname:
 *          type: string
 */

/**
 * @swagger
 * tags:
 *  name: User
 *  description: 회원
 */

/**
 * @swagger
 * paths:
 *  /user/add:
 *    post:
 *      summary: 회원가입
 *      tags: [User]
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                  required: true
 *                email:
 *                  type: string
 *                  required: true
 *                nickname:
 *                  type: string
 *                  required: true
 *                name:
 *                  type: string
 *                  required: true
 *                notice:
 *                  type: integer
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/add', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {id, email, nickname, name, notice} = req.body

  let sql = `SELECT id FROM user WHERE id = '${id}'`
  let result = await conn.query(sql)

  if (result.length != 0) return res.json({msg: 'exist user'})

  sql = `
    INSERT INTO user(id, email, nickname, name, notice) 
    VALUES(
      '${id}',
      '${email}',
      '${nickname}',
      '${name == undefined ? '' : name}',
      ${notice == undefined ? null : notice}
    )
  `
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /user/email-check:
 *    post:
 *      summary: 회원 이메일 중복체크
 *      tags: [User]
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              properties:
 *                email:
 *                  type: string
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/email-check', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {email} = req.body

  let sql = `SELECT count(email) AS count FROM user WHERE email='${email}'`
  let result = await conn.query(sql)

  res.json({count: result[0].count})
}))

//Middleware
app.use(token.decodeToken)

/**
 * @swagger
 * paths:
 *  /user/info:
 *    get:
 *      summary: 회원정보
 *      tags: [User]
 *      security:
 *        - Authorization: []
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/User'
 *        "400":
 *          description: error
 */
app.get('/info', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()

  let sql = `SELECT email, nickname, name, gender, company, nationality, imgpath FROM user WHERE id = '${req.uid}'` 
  let response = await conn.query(sql)

  res.json(response[0])
}))

/**
 * @swagger
 * paths:
 *  /user/edit:
 *    post:
 *      summary: 회원정보수정
 *      tags: [User]
 *      security:
 *        - Authorization: []
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              properties:
 *                nickname:
 *                  type: string
 *                name:
 *                  type: string
 *                email:
 *                  type: string
 *                gender:
 *                  type: integer
 *                company:
 *                  type: string
 *                nationality:
 *                  type: string
 *                imgpath:
 *                  type: string
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/edit', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {nickname, name, email, gender, company, nationality, imgpath} = req.body

  let sql = `
    UPDATE user SET 
    nickname = '${nickname}',
    name = '${name}',
    email = '${email}',
    gender = ${gender ? gender : 0},
    company = '${company ? company : ''}',
    nationality = '${nationality ? nationality : ''}',
    imgpath = '${imgpath ? imgpath : ''}' 
    WHERE id = '${req.uid}'
  `
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /user/delete:
 *    delete:
 *      summary: 회원탈퇴
 *      tags: [User]
 *      security:
 *        - Authorization: []
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.delete('/delete', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()

  let sql = `DELETE FROM user WHERE id = '${req.uid}'`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

app.use((err, req, res, next) => {
  console.log(err)
  logger.error(err)
  res.status(500).json({err: err.toString()})
})

module.exports = app