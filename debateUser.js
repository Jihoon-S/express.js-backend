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
*    DebateUser:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *          description: ID
 *        debateid:
 *          type: integer
 *          description: Debate ID
 *        userid:
 *          type: string
 *          description: User ID
 *        teamid:
 *          type: integer
 *          description: DebateTeam ID
 *        nickname:
 *          type: string
 *          description: 닉네임
 *        name: 
 *          type: string
 *          description: 이름
 *        email:
 *          type: string
 *          description: 이메일
 *        mobile:
 *          type: string
 *          description: 전화번호
 *        gender:
 *          type: integer
 *          description: 성별 0:미상/1:남성/2:여성
 *        company:
 *          type: string
 *          description: 소속
 *        nationality:
 *          type: string
 *        memberemail:
 *          type: string
 *          description: 팀원 메일
 *        status:
 *          type: integer
 *          description: 상태 1:대기/2:승인/4:거절
 *        attend:
 *          type: integer
 *          description: 참석여부 1:불참/2:참석
 *        unitydebatecreator:
 *          type: string
 *        unityyesno:
 *          type: string
 */

/**
 * @swagger
 * tags:
 *  name: DebateUser
 *  description: 토론 참가자
 */

/**
 * @swagger
 * paths:
 *  /debateUser/id-check/{debateId}:
 *    post:
 *      summary: ID 중복체크
 *      tags: [DebateUser]
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                userId:
 *                  type: string
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/id-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {userId} = req.body

  let sql = `SELECT COUNT(userid) AS count FROM debateuser WHERE debateid = ${debateId} AND userid = '${userId}' AND status < 3`
  let response = await conn.query(sql)

  res.json(response[0])
}))

/**
 * @swagger
 * paths:
 *  /debateUser/status-check/{debateId}:
 *    post:
 *      summary: 참가자 승인상태 체크
 *      tags: [DebateUser]
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                userId:
 *                  type: string
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/status-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {userId} = req.body

  let sql = `SELECT COUNT(id) AS count FROM debateuser WHERE debateid = ${debateId} AND userid = '${userId}' AND status = 2`
  let response = await conn.query(sql)
  
  res.json(response[0])
}))

/**
 * @swagger
 * paths:
 *  /debateUser/auto-cancel:
 *    post:
 *      summary: 자동 참가 취소
 *      tags: [DebateUser]
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/auto-cancel', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()

  let sql = `
    SELECT 
      id, teamid, email
    FROM debateuser
    WHERE 
      status = 1 AND 
      teamid IS NOT NULL AND
      applied IS NOT NULL AND
      TIMESTAMPDIFF(HOUR, applied, now()) >= 48
  `
  let result = await conn.query(sql)

  const ids = result.map((r) => r.id)
  const teamIds = result.map((r) => r.teamid != null ? r.teamid : 0)
  
  if (ids.length != 0) {
    sql = `
      UPDATE debateuser
      SET status = 8
      WHERE id IN (${ids})
    `
    await conn.query(sql)
  }

  if (teamIds.length != 0) {
    sql = `
      UPDATE debateteam
      SET status = 8
      WHERE id IN (${teamIds})
    `
    await conn.query(sql)
  }

  res.json({msg: 'success'})
}))

//Middleware
app.use(token.decodeToken)

/**
 * @swagger
 * paths:
 *  /debateUser/add:
 *    post:
 *      summary: 토론 참가신청
 *      tags: [DebateUser]
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
 *                teamId:
 *                  type: integer
 *                  required: true
 *                nickname:
 *                  type: string
 *                  required: true
 *                name:
 *                  type: string
 *                email:
 *                  type: string
 *                mobile:
 *                  type: string
 *                gender:
 *                  type: string
 *                  default: 0
 *                company: 
 *                  type: string
 *                nationality:
 *                  type: string
 *                memberemail:
 *                  type: string
 *                status:
 *                  type: integer
 *                  default: 1
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/add', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, teamId, nickname, name, email, mobile, gender, company, nationality, memberemail, status} = req.body

  let sql = `
    SELECT COUNT(id) AS count
    FROM debateuser
    WHERE debateid = ${debateId} AND email = '${email}' AND status < 3
  `
  let result = await conn.query(sql)

  if (result[0].count != 0) return res.json({msg: 'exist'})

  sql = `
    INSERT INTO debateuser(debateid, teamid, userid, nickname, name, email, mobile, gender, company, nationality, memberemail, status) 
    VALUES(
      ${debateId}, 
      ${teamId ? teamId : null}, 
      '${req.uid}', 
      '${nickname}', 
      '${name ? name : ''}', 
      '${email ? email : ''}', 
      '${mobile ? mobile : ''}', 
      ${gender ? gender : 0}, 
      '${company ? company : ''}', 
      '${nationality ? nationality : ''}',
      '${memberemail}',
      ${status}
    )
  `
  result = await conn.query(sql)
    
  res.json({msg: 'success', id: result.insertId})
}))

/**
 * @swagger
 * paths:
 *  /debateUser/cancel/{id}:
 *    post:
 *      summary: 토론 참가자 신청취소
 *      tags: [DebateUser]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: integer
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/cancel/:id', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {id} = req.params
  
  let sql = `UPDATE debateuser SET status = 8 WHERE id = ${id}`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateUser/approve:
 *    post:
 *      security:
 *        - Authorization: []
 *      summary: 토론 참가자 신청승인
 *      tags: [DebateUser]
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                ids:
 *                  type: array
 *                  items:
 *                    type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/approve', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {ids} = req.body

  let sql = `UPDATE debateuser SET status = 2 WHERE id IN (${ids})`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateUser/refuse:
 *    post:
 *      security:
 *        - Authorization: []
 *      summary: 토론 참가자 신청거절
 *      tags: [DebateUser]
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                ids:
 *                  type: array
 *                  items:
 *                    type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/refuse', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {ids} = req.body

  const sql = `UPDATE debateuser SET status = 4 WHERE id IN (${ids})`
  await conn.query(sql)

  res.json({mst: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateUser/attend/{id}:
 *    post:
 *      summary: 토론 참가자 참가처리
 *      tags: [DebateUser]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: integer
 *      responses:
 *        200:
 *          description: success
 *        400:
 *          description: error
 */
 app.post('/attend/:id', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {id} = req.params

  let sql = `UPDATE debateuser SET attend = 1 WHERE id = ${id}`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateUser/list/{debateId}:
 *    get:
 *      summary: 토론 참가자 리스트
 *      tags: [DebateUser]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: field
 *          schema:
 *            type: string
 *        - in: query
 *          name: searchWord
 *          schema:
 *            type: string
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  id:
 *                    type: integer
 *                  name:
 *                    type: string
 *                  nickname:
 *                    type: string
 *                  email:
 *                    type: string
 *                  mobile:
 *                    type: string
 *                  nationality:
 *                    type: string
 *                  status:
 *                    type: integer
 *                  attend:
 *                    type: integer
 *                  recent:
 *                    type: integer
 *                  number:
 *                    type: integer
 *                  total:
 *                    type: integer
 *                  approved:
 *                    type: integer
 *        "400":
 *          description: error
 */
app.get('/list/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {field, searchWord} = req.query

  let sql = `
    SELECT 
      id, name, nickname, email, mobile, nationality, status, attend, 
      (SELECT MAX(round) FROM debatetournament WHERE agree = u.id OR disagree = u.id AND debateid = ${debateId}) AS recent, 
      row_number() OVER(ORDER BY id) AS number,
      (SELECT COUNT(id) FROM debateuser WHERE debateid = ${debateId}${searchWord == 'undefined' ? '' : ' AND ' + field + ' LIKE "%' + searchWord + '%"'}) AS total, 
      (SELECT COUNT(id) FROM debateuser WHERE debateid = ${debateId} AND status = 2${searchWord == 'undefined' ? '' : ' AND ' + field + ' LIKE "%' + searchWord + '%"'}) AS approved 
    FROM debateuser u
    WHERE debateid = ${debateId}${searchWord == 'undefined' ? '' : ' AND u.' + field + ' LIKE "%' + searchWord + '%"'}
    ORDER BY id DESC
  `
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateUser/email-check/{debateId}:
 *    post:
 *      summary: 이메일 중복체크
 *      tags: [DebateUser]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
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
app.post('/email-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {email} = req.body

  let sql = `
    SELECT COUNT(email) AS count, memberemail 
    FROM debateuser 
    WHERE debateid = ${debateId} AND email = '${email}' AND status < 3
  `
  let result = await conn.query(sql)
  let response
  
  if (result[0].count != 0) {
    if (result[0].memberemail == '') {
      response = {msg : 'member already success'}
    
    } else if (result[0].memberemail == undefined) {
      response = {msg : 'already success'}
    
    } else {
      response = {msg : 'leader already success'}
    }
  
  } else {
    response = {msg : 'possible'}
  }

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateUser/member-email-check/{debateId}:
 *    post:
 *      summary: 팀원 이메일 중복체크
 *      tags: [DebateUser]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
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
app.post('/member-email-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {email} = req.body

  let sql = `
    SELECT COUNT(email) AS count 
    FROM debateuser 
    WHERE debateid = ${debateId} AND email = '${email}' AND status < 3
  `
  let result = await conn.query(sql)  

  if (result[0].count != 0) return res.json({msg : 'already success'})
    
  sql = `
    SELECT GROUP_CONCAT(memberemail) AS all_memberemail
    FROM debateuser
    GROUP by debateid
    HAVING debateid = ${debateId}
  `
  result = await conn.query(sql)
  
  if (result[0].all_memberemail != null) {
    if (result[0].all_memberemail.search(`${email}`) != '-1') {
      response = {msg : 'already another team member'}
    
    } else {
      response = {msg : 'possible'}
    }
  
  } else {
    response = {msg: 'possible'}
  }

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateUser/nick-check/{debateId}:
 *    post:
 *      summary: 닉네임 중복체크
 *      tags: [DebateUser]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                nickname:
 *                  type: string
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/nick-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {nickname} = req.body

  let sql = `SELECT COUNT(nickname) AS count FROM debateuser WHERE debateid = ${debateId} AND nickname = '${nickname}' AND status < 3`
  let response = await conn.query(sql)
  
  res.json(response[0])
}))

/**
 * @swagger
 * paths:
 *  /debateUser/max-check/{debateId}:
 *    get:
 *      summary: 모집 완료 체크
 *      tags: [DebateUser]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.get('/max-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params

  let sql = `
    SELECT 
      max_team,
      IF(
        freedom_to = 0, 
        (SELECT COUNT(id) FROM debateuser WHERE debateid = ${debateId} AND status = 2), 
        (SELECT COUNT(id) FROM debateteam WHERE debateid = ${debateId} AND status = 2)
      ) AS num_participants
    FROM debate
    WHERE id = ${debateId} AND status = 0
  `
  let result = await conn.query(sql)

  let isMax = 0
  if (result[0].max_team <= result[0].num_participants) isMax = 1

  res.json({is_max: isMax})
}))

app.use((err, req, res, next) => {
  console.log(err)
  logger.error(err)
  res.status(500).json({err: err.toString()})
})

module.exports = app