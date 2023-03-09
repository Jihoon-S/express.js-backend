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
 *    DebateTeam:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *          description: ID
 *        debateid:
 *          type: integer
 *          description: Debate ID
 *        name:
 *          type: string
 *          description: 팀이름
 *        status:
 *          type: integer
 *          description: 1:신청완료(참가대기)/2:참가확정/4:참가거절/8:취소
 *        attend:
 *          type: integer
 *          description: 0:불참/1:참가
 *        code:
 *          type: string
 *          description: 
 */

/**
 * @swagger
 * tags:
 *  name: DebateTeam
 *  description: 토론 팀
 */

//Middleware
app.use(token.decodeToken)

/**
 * @swagger
 * paths:
 *  /debateTeam/list/{debateId}:
 *    get:
 *      summary: 토론 참가 팀 리스트
 *      tags: [DebateTeam]
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
 *                  status:
 *                    type: integer
 *                  attend:
 *                    type: integer
 *                  number:
 *                    type: integer
 *                  recent:
 *                    type: integer
 *                  total:
 *                    type: integer
 *                  approved:
 *                    type: integer
 *                  teammate:
 *                    type: object
 *                    properties:
 *                      nickname:
 *                        type: string
 *                      name:
 *                        type: string
 *                      mobile:
 *                        type: string
 *                      email:
 *                        type: string
 *                      nationality:
 *                        type: string
 *        "400":
 *          description: error
 */
 app.get('/list/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {field, searchWord} = req.query
  let response

  if (field == 'nickname') {
    let sql = `SELECT teamid FROM debateuser WHERE debateid = ${debateId}${searchWord == 'undefined' ? '' : ' AND nickname LIKE "%' + searchWord + '%"'}`
    let result = await conn.query(sql)

    const ids = result.map((r) => r.teamid)

    sql = `
      SELECT 
        id, name, status, attend, 
        row_number() OVER(ORDER BY id) AS number, 
        (SELECT MAX(round) FROM debatetournament WHERE agree = t.id OR disagree = t.id) AS recent, 
        (SELECT COUNT(id) FROM debateteam WHERE id IN(${ids.length == 0 ? 0 : ids})) AS total, 
        (SELECT COUNT(id) FROM debateteam WHERE id IN(${ids.length == 0 ? 0 : ids}) AND status = 2) AS approved 
      FROM debateteam t
      WHERE id IN(${ids.length == 0 ? 0 : ids})
      ORDER BY id DESC
    `
    response = await conn.query(sql)

    for (let r of response) {
      sql = `
        SELECT nickname, name, mobile, email, nationality
        FROM debateuser WHERE debateid = ${debateId} AND teamid = ${r.id}
      `
      r.teammate = await conn.query(sql)
    }
  
  } else {
    let sql = `
      SELECT 
        id, name, status, attend, 
        row_number() OVER(ORDER BY id) AS number, 
        (SELECT MAX(round) FROM debatetournament WHERE agree = t.id OR disagree = t.id) AS recent, 
        (SELECT COUNT(id) FROM debateteam WHERE debateid = ${debateId}${searchWord == 'undefined' ? '' : ' AND name LIKE "%' + searchWord + '%"'}) AS total, 
        (SELECT COUNT(id) FROM debateteam WHERE debateid = ${debateId} AND status = 2${searchWord == 'undefined' ? '' : ' AND name LIKE "%' + searchWord + '%"'}) AS approved 
      FROM debateteam t
      WHERE debateid = ${debateId}${searchWord == 'undefined' ? '' : ' AND name LIKE "%' + searchWord + '%"'}
      ORDER BY id DESC
    `
    response = await conn.query(sql)

    for (let r of response) {
      sql = `
        SELECT nickname, name, mobile, email, nationality
        FROM debateuser WHERE debateid = ${debateId} AND teamid = ${r.id}
      `
      r.teammate = await conn.query(sql)
    }
  }

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateTeam/cancel/{debateUserId}:
 *    post:
 *      summary: 토론 팀 신청취소
 *      tags: [DebateTeam]
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
 app.post('/cancel/:debateUserId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateUserId} = req.params
  
  let sql = `SELECT teamid FROM debateuser WHERE id = ${debateUserId}`
  let result = await conn.query(sql)

  const teamId = result[0].teamid

  sql = `UPDATE debateteam SET status = 8 WHERE id = ${teamId}`
  await conn.query(sql)

  sql = `UPDATE debateuser SET status = 8 WHERE teamid = ${teamId}`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTeam/approve:
 *    post:
 *      security:
 *        - Authorization: []
 *      summary: 토론 팀 신청승인
 *      tags: [DebateTeam]
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

  let sql = `UPDATE debateteam SET status = 2 WHERE id IN (${ids})`
  await conn.query(sql)

  sql = `UPDATE debateuser SET status = 2 WHERE teamid IN (${ids})`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTeam/refuse:
 *    post:
 *      security:
 *        - Authorization: []
 *      summary: 토론 팀 신청거절
 *      tags: [DebateTeam]
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

  let sql = `UPDATE debateteam SET status = 4 WHERE id IN (${ids})`
  await conn.query(sql)

  sql = `UPDATE debateuser SET status = 4 WHERE teamid IN (${ids})`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTeam/attend/{id}:
 *    post:
 *      summary: 토론 팀 참가처리
 *      tags: [DebateTeam]
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

  let sql = `UPDATE debateteam SET attend = 1 WHERE id = ${id}`
  await conn.query(sql)
  
  sql = `UPDATE debateuser SET attend = 1 WHERE teamid = ${id}`
  await conn.query(sql)
  
  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTeam/add/{debateId}:
 *    post:
 *      summary: 토론 팀 생성
 *      tags: [DebateTeam]
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
 *                name:
 *                  type: string
 *                  required: true
 *                status:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/add/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {name, status} = req.body
  
  let sql = `SELECT code FROM debateteam WHERE debateid = ${debateId}`
  let result = await conn.query(sql)

  let isUnique = false
  let code

  while (!isUnique) {
    let count = 0
    code = String(Math.floor(100000 + Math.random() * 900000))
    
    for (let r of result) {
        if (r.code == code) count++
    }

    if (count == 0) isUnique = true
  }

  sql = `SELECT COUNT(id) AS count FROM debateteam WHERE debateid = ${debateId} AND name ='${name}' AND status < 3`
  result = await conn.query(sql)

  if (result[0].count != 0) return res.json({msg: 'exist'})

  sql = `INSERT INTO debateteam(debateid, name, status, code) VALUES(${debateId}, '${name}', '${status}', '${code}')`
  result = await conn.query(sql)

  res.json({msg: 'success', teamId: result.insertId, code: code})
}))

/**
 * @swagger
 * paths:
 *  /debateTeam/name-check/{debateId}:
 *    post:
 *      summary: 토론 팀이름 중복체크
 *      tags: [DebateTeam]
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
 *                name:
 *                  type: string
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/name-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {name} = req.body

  let sql = `SELECT COUNT(name) AS count FROM debateteam WHERE debateid = ${debateId} AND name = '${name}' AND status < 3`
  let response = await conn.query(sql)

  res.json(response[0])
}))

/**
 * @swagger
 * paths:
 *  /debateTeam/code-check/{debateId}:
 *    post:
 *      summary: 팀 초대 코드 체크
 *      tags: [DebateTeam]
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
 *                code:
 *                  type: string
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/code-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {code} = req.body

  let sql = `SELECT id, name FROM debateteam WHERE debateid = ${debateId} AND code = '${code}' AND status < 3`
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateTeam/member-check/{debateId}:
 *    post:
 *      summary: 팀원 모집 완료 체크
 *      tags: [DebateTeam]
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
 *                teamId:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/member-check/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {teamId} = req.body

  let sql = `
    SELECT 
      COUNT(id) = (SELECT freedom_to FROM debate WHERE id = ${debateId})+1 AS is_max
    FROM debateuser 
    WHERE debateid = ${debateId} AND teamId = '${teamId}' AND status < 3
  `
  let response = await conn.query(sql)

  res.json(response[0])
}))

app.use((err, req, res, next) => {
  console.log(err)
  logger.error(err)
  res.status(500).json({err: err.toString()})
})

module.exports = app