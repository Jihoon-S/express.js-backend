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
 * tags:
 *  name: Debate
 *  description: 토론
 */

/**
 * @swagger
 * paths:
 *  /debateList:
 *    get:
 *      summary: 토론 리스트
 *      tags: [Debate]
 *      parameters:
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
 *                  pageCount:
 *                    type: integer
 *                  result:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: integer
 *                      title:
 *                        type: string
 *                      image:
 *                        type: string
 *                      freedom_to:
 *                        type: integer
 *                      num_team:
 *                        type: integer
 *                      amount:
 *                        type: integer
 *                      apply_sdate:
 *                        type: string
 *                      apply_edate:
 *                        type: string
 *                      sdate:
 *                        type: string
 *                      edate:
 *                        type: string
 *                      status:
 *                        type: integer
 *                      is_applying:
 *                        type: integer
 *                      num_participants:
 *                        type: integer
 *        "400":
 *          description: error
 */
app.get('/', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {searchWord} = req.query

  let sql = `
    SELECT 
      id, title, image, freedom_to, max_team AS num_team, amount, 
      apply_sdate, apply_edate, sdate, edate, 
      now() BETWEEN sdate AND edate AS is_active,  
      now() < sdate AS is_before,  
      IF(
        freedom_to = 0, 
        (SELECT COUNT(u.id) FROM debateuser u WHERE debateid = d.id AND status = 2), 
        (SELECT COUNT(t.id) FROM debateteam t WHERE debateid = d.id AND status = 2)
      ) AS num_participants
    FROM debate d
    WHERE status = 0${searchWord == undefined ? '' : ' AND title LIKE "%' + searchWord + '%"'} AND id > 10
    ORDER BY id DESC 
  `
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateList/detail/{id}:
 *    get:
 *      summary: 토론 상세
 *      tags: [Debate]
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
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
 *                  id:
 *                    type: integer
 *                  category:
 *                    type: integer
 *                  title:
 *                    type: string
 *                  image:
 *                    type: string
 *                  freedom:
 *                    type: integer
 *                  freedom_to:
 *                    type: integer
 *                  max_team:
 *                    type: integer
 *                  amount:
 *                    type: integer
 *                  amount_to:
 *                    type: integer
 *                  description:
 *                    type: string
 *                  progress1:
 *                    type: integer
 *                  progress2:
 *                    type: integer
 *                  progress3:
 *                    type: integer
 *                  schedule:
 *                    type: integer
 *                  schedule_to:
 *                    type: integer
 *                  score:
 *                    type: integer
 *                  score_to:
 *                    type: integer
 *                  score_date:
 *                    type: integer
 *                  approval:
 *                    type: integer
 *                  requires:
 *                    type: integer
 *                  user_name:
 *                    type: string
 *                  user_hp:
 *                    type: string
 *                  user_email:
 *                    type: string
 *                  user_company:
 *                    type: string
 *                  apply_sdate:
 *                    type: string
 *                  apply_edate:
 *                    type: string
 *                  sdate:
 *                    type: string
 *                  edate:
 *                    type: string
 *                  recruit:
 *                    type: integer
 *                  bracket_created:
 *                    type: integer
 *                  bracket_finalized:
 *                    type: integer
 *                  finished_round:
 *                    type: integer
 *                  is_active:
 *                    type: integer
 *                  is_applying:
 *                    type: integer
 *                  is_before:
 *                    type: integer
 *                  is_before_applying:
 *                    type: integer
 *                  num_participants:
 *                    type: integer
 *        "400":
 *          description: error
 */
 app.get('/detail/:id', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {id} = req.params

  let sql = `
    SELECT 
      id, category, title, image, freedom, freedom_to, max_team, amount, amount_to, 
      description, progress1, progress2, progress3, schedule, schedule_to, score, 
      score_date, score_to, approval, requires, user_name, user_hp, user_email, 
      user_company, apply_sdate, apply_edate, sdate, edate, recruit, 
      bracket_created, bracket_finalized, finished_round, 
      now() BETWEEN sdate AND edate AS is_active, 
      now() BETWEEN apply_sdate AND apply_edate AS is_applying, 
      now() < sdate AS is_before,
      now() < apply_sdate AS is_before_applying, 
      IF(
        freedom_to = 0, 
        (SELECT COUNT(u.id) FROM debateuser u WHERE debateid = d.id ANd status = 2), 
        (SELECT COUNT(t.id) FROM debateteam t WHERE debateid = d.id AND status = 2)
      ) AS num_participants 
    FROM debate d
    WHERE id = ${id} AND status = 0
  `
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateList/spectate:
 *    get:
 *      summary: 시청 가능한 토론 내역
 *      tags: [Debate]
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
 *                  title:
 *                    type: string
 *                  image:
 *                    type: string
 *                  max_team:
 *                    type: integer
 *                  sdate:
 *                    type: string
 *                  edate:
 *                    type: string
 *                  apply_sdate:
 *                    type: string
 *                  apply_edate:
 *                    type: string
 *                  is_ended:
 *                    type: integer
 *                  num_participants:
 *                    type: integer
 *        "400":
 *          description: error
 */
 app.get('/spectate', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()

  const sql = `
    SELECT 
      id, title, image, max_team, apply_sdate, apply_edate, sdate, edate, 
      now() > edate AS is_ended,
      IF(
        freedom_to = 0, 
        (SELECT COUNT(u.id) FROM debateuser u WHERE debateid = d.id AND status = 2), 
        (SELECT COUNT(t.id) FROM debateteam t WHERE debateid = d.id AND status = 2)
      ) AS num_participants 
    FROM debate d
    WHERE status = 0 AND bracket_finalized = 1 AND now() >= sdate
    ORDER BY id DESC 
  `
  let response = await conn.query(sql)

  res.json(response)
}))

//Middleware
app.use(token.decodeToken)

/**
 * @swagger
 * paths:
 *  /debateList/join:
 *    get:
 *      summary: 신청 가능한 토론 내역
 *      tags: [Debate]
 *      security:
 *        - Authorization: []
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  result:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: integer
 *                      title:
 *                        type: string
 *                      image:
 *                        type: string
 *                      max_team:
 *                        type: integer
 *                      num_participants:
 *                        type: integer
 *                      apply_sdate:
 *                        type: string
 *                      apply_edate:
 *                        type: string
 *                      sdate:
 *                        type: string
 *                      edate:
 *                        type: string
 *                      is_free:
 *                        type: integer
 *        "400":
 *          description: error
 */
 app.get('/join', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()

  let sql = `
    SELECT 
      id, title, image, max_team, apply_sdate, apply_edate, sdate, edate, 
      IF(
        freedom_to = 0, 
        (SELECT COUNT(u.id) FROM debateuser u WHERE debateid = d.id AND status = 2), 
        (SELECT COUNT(t.id) FROM debateteam t WHERE debateid = d.id AND status = 2)
      ) AS num_participants, 
      IF(amount = 0, 0, 1) AS is_free
    FROM debate d 
    WHERE (now() BETWEEN apply_sdate AND apply_edate) AND status = 0 AND recruit = 0 
    ORDER BY id DESC 
  `
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateList/created:
 *    get:
 *      summary: 개설한 토론 내역
 *      tags: [Debate]
 *      security:
 *        - Authorization: []
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  result:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: integer
 *                      title:
 *                        type: string
 *                      image:
 *                        type: string
 *                      count:
 *                        type: integer
 *                      apply_sdate:
 *                        type: string
 *                      apply_edate:
 *                        type: string
 *                      sdate:
 *                        type: string
 *                      edate:
 *                        type: string
 *                      status:
 *                        type: integer
 *        "400":
 *          description: error
 */
 app.get('/created', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()

  let sql = `
    SELECT 
      id, title, image, apply_sdate, apply_edate, sdate, edate, 
      CASE
        WHEN (SELECT now() BETWEEN sdate AND edate FROM debate WHERE id = d.id) = 0 AND (SELECT now() >= sdate FROM debate WHERE id = d.id) = 0 THEN 0
        WHEN (SELECT now() BETWEEN sdate AND edate FROM debate WHERE id = d.id) = 1 THEN 1
        WHEN (SELECT now() BETWEEN sdate AND edate FROM debate WHERE id = d.id) = 0 AND (SELECT now() >= sdate FROM debate WHERE id = d.id) = 1 THEN 2
        ELSE 3
      END AS status
    FROM debate d 
    WHERE user_id = '${req.uid}' AND status = 0
    ORDER BY id DESC 
  `
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateList/applied:
 *    get:
 *      summary: 신청한 토론 내역
 *      tags: [Debate]
 *      security:
 *        - Authorization: []
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
 *                  debate_user_id:
 *                    type: integer
 *                  title:
 *                    type: string
 *                  image:
 *                    type: string
 *                  max_team:
 *                    type: integer
 *                  sdate:
 *                    type: string
 *                  edate:
 *                    type: string
 *                  apply_sdate:
 *                    type: string
 *                  apply_edate:
 *                    type: string
 *                  is_active:
 *                    type: integer
 *                  is_started:
 *                    type: integer
 *                  is_applying:
 *                    type: integer
 *                  num_participants:
 *                    type: integer
 *                  can_delete:
 *                    type: integer
 *                  is_team:
 *                    type: integer
 *        "400":
 *          description: error
 */
app.get('/applied', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()

  let sql = `SELECT debateid FROM debateuser WHERE userid = '${req.uid}'`
  let result = await conn.query(sql)
  
  const debateIds = result.map((r) => r.debateid)
  if (debateIds.length == 0) return res.json([])

  sql = `
    SELECT 
      id, title, image, max_team, apply_sdate, apply_edate, sdate, edate, recruit,
      now() BETWEEN apply_sdate AND apply_edate AS is_applying, 
      now() BETWEEN sdate AND edate AS is_active, 
      now() > sdate AS is_started,
      IF(
        freedom_to = 0, 
        (SELECT COUNT(u.id) FROM debateuser u WHERE debateid = d.id AND status = 2), 
        (SELECT COUNT(t.id) FROM debateteam t WHERE debateid = d.id AND status = 2)
      ) AS num_participants, 
      (SELECT id FROM debateuser WHERE debateid = d.id AND userid = '${req.uid}' AND status < 3) AS debate_user_id, 
      IF(
        (SELECT teamid FROM debateuser WHERE debateid = d.id AND userid = '${req.uid}' AND status < 3) IS NULL,
        1,
        IF(
          (SELECT id FROM debateuser WHERE debateid = d.id AND userid = '${req.uid}' AND status < 3) = 
          (SELECT MIN(id) FROM debateuser WHERE debateid = d.id AND teamid = (SELECT teamid FROM debateuser WHERE debateid = d.id AND userid = '${req.uid}' AND status < 3)),
          1,
          0
        )
      ) AS can_delete,
      IF(
        (SELECT teamid FROM debateuser WHERE debateid = d.id AND userid = '${req.uid}' AND status < 3) IS NULL,
        0,
        1
      ) AS is_team,
      IF(
        (SELECT teamid FROM debateuser WHERE debateid = d.id AND userid = '${req.uid}' AND status < 3) IS NULL,
        0, 
        (SELECT code FROM debateteam WHERE id = (SELECT teamid FROM debateuser WHERE debateid = d.id AND userid = '${req.uid}' AND status < 3))
      ) AS code
    FROM debate d
    WHERE id IN (${debateIds}) AND status = 0 AND (SELECT MIN(status) FROM debateuser WHERE debateid = d.id AND userid = '${req.uid}') < 3
    ORDER BY id DESC 
  `
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateList/judge:
 *    get:
 *      summary: 심사할 토론 내역
 *      tags: [Debate]
 *      security:
 *        - Authorization: []
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
 *                  title:
 *                    type: string
 *                  image:
 *                    type: string
 *                  sdate:
 *                    type: string
 *                  edate:
 *                    type: string
 *                  is_active:
 *                    type: integer
 *                  is_started:
 *                    type: integer
 *        "400":
 *          description: error
 */
 app.get('/judge', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()

  let sql = `SELECT debateid FROM debatejudginguser WHERE userid = '${req.uid}'`
  let result = await conn.query(sql)
  
  const debateIds = result.map((r) => r.debateid)
  if (debateIds.length == 0) return res.json([])

  sql = `
    SELECT 
      id, title, image, sdate, edate, 
      now() BETWEEN sdate AND edate AS is_active, 
      now() > sdate AS is_started  
    FROM debate 
    WHERE id IN (${debateIds}) AND status = 0
    ORDER BY id DESC 
  `
  let response = await conn.query(sql)

  res.json(response)
}))

app.use((err, req, res, next) => {
  console.log(err)
  logger.error(err)
  res.status(500).json({err: err.toString()})
})

module.exports = app