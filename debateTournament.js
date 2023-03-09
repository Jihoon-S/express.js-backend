const express = require('express')
const app = express()
const token = require('./decodeToken')
const util = require('./util')
const uuid = require('uuid')
const fs = require('fs')
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
 *    DebateTournament:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *          description: ID
 *        debateid:
 *          type: integer
 *          description: Debate ID
 *        agree:
 *          type: integer
 *          description: 찬성측
 *        disagree:
 *          type: integer
 *          description: 반대측
 *        round:
 *          type: integer
 *          description: 라운드
 *        subject:
 *          type: string
 *          description: 주제
 *        matchid:
 *          type: string
 *          description: 개별 매치 ID
 *        win:
 *          type: integer
 *          description: 승자 ID
 *        judgelist:
 *          type: string
 *          description: 심사위원
 *        schedule:
 *          type: string
 *          description: 시작시간
 *        filenamelist:
 *          type: string
 *          description: 파일 이름 리스트
 */

/**
 * @swagger
 * tags:
 *  name: DebateTournament
 *  description: 대진표
 */

/**
 * @swagger
 * paths:
 *  /debateTournament/round/{debateId}:
 *    get:
 *      summary: 토론 별 라운드 정보 가져오기
 *      tags: [DebateTournament]
 *      parameters:
 *        - in: path
 *          name: debateId
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
 *                  round:
 *                    type: integer
 *        "400":
 *          description: error
 */
app.get('/round/:debateId', wrapAsync(async (req,res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params

  let sql = `SELECT freedom_to FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)
  
  sql = `
    SELECT id
    FROM ${result[0].freedom_to == 0 ? 'debateuser' : 'debateteam'}
    WHERE debateid = ${debateId} AND status = 2
  `
  result = await conn.query(sql)
  
  let numRounds = 0

  util.isSquareNum(result.length) ?
    numRounds = util.getExponent(result.length, 2)
  :
    numRounds = util.getExponent(result.length, 2) + 1
  
  res.json({numRounds: numRounds})
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/dates/{debateId}/{round}:
 *    get:
 *      summary: 라운드 별 날짜 정보 가져오기
 *      tags: [DebateTournament]
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *        - in: path
 *          name: round
 *          required: true
 *          schema:
 *            tpye: integer
 *        - in: query
 *          name: timeOffset
 *          required: true
 *          schema:
 *            tpye: integer
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  date:
 *                    type: integer
 *                  count:
 *                    type: integer
 *                  recruit:
 *                    type: integer
 *        "400":
 *          description: error
 */
 app.get('/dates/:debateId/:round', wrapAsync(async (req,res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, round} = req.params
  const {timeOffset} = req.query

  let sql = `
    SELECT 
      DATE_FORMAT(TIMESTAMPADD(HOUR, ${timeOffset}, schedule), '%Y-%m-%d') AS date, 
      COUNT(matchid) as count
    FROM debatetournament 
    WHERE debateid = ${debateId} AND round = ${round}
    GROUP BY date
  `
  let response = await conn.query(sql)

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/bracket/{debateId}:
 *    get:
 *      summary: 라운드/날짜 별 매치 리스트 가져오기
 *      tags: [DebateTournament]
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: round
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: date
 *          required: true
 *          schema:
 *            type: string
 *            example: '2022-10-25'
 *        - in: query
 *          name: timeOffset
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
 *                  matchid:
 *                    type: string
 *                  agree:
 *                    type: string
 *                  disagree:
 *                    type: string
 *                  is_answered:
 *                    type: integer
 *                  is_active:
 *                    type: integer
 *                  is_before:
 *                    type: integer
 *                  time:
 *                    type: string
 *                    example: 12:00
 *                  end_time:
 *                    type: string
 *                  diff:
 *                    type: integer
 *                  subject:
 *                    type: string
 *                  win:
 *                    type: integer
 *                  agree_team_id:
 *                    type: integer
 *                  disagree_team_id:
 *                    type: integer
 *                  agree_team_name:
 *                    type: string
 *                  disagree_team_name:
 *                    type: string
 *                  user1:
 *                    type: string
 *                  user2:
 *                    type: string
 *                  user3:
 *                    type: string
 *                  user4:
 *                    type: string
 *                  user5:
 *                    type: string
 *                  user6:
 *                    type: string
 *                  streamurl:
 *                    type: string
 *                  vodurl:
 *                    type: string
 *        "400":
 *          description: error
 */
 app.get('/bracket/:debateId', wrapAsync(async (req,res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {round, date, timeOffset} = req.query

  let sql = `
    SELECT 
      id, matchid, subject, win, agree AS agree_team_id, disagree AS disagree_team_id, 
      user1, user2, user3, user4, user5, user6, 
      (SELECT nickname FROM debateuser WHERE id = d.agree) AS agree, 
      IF(
        (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
        (SELECT userid FROM debateuser WHERE id = d.agree), 
        0
      ) AS agree_user_id, 
      (SELECT nickname from debateuser WHERE id = d.disagree) AS disagree, 
      IF(
        (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
        (SELECT userid FROM debateuser WHERE id = d.disagree), 
        0
      ) AS disagree_user_id, 
      IF(
        (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 0, 1
      ) AS is_team, 
      (SELECT COUNT(*) FROM debatejudginganswer WHERE debateid = ${debateId} AND debatejudginguserid = (SELECT id FROM debatejudginguser WHERE debateid = ${debateId} AND userid = '${req.uid}') AND debatetournamentmatch = d.matchid) = 
      (SELECT COUNT(*)*2 FROM debatejudging WHERE debateid = ${debateId}) AS is_answered, 
      now() BETWEEN schedule AND TIMESTAMPADD(second, (SELECT progress1 + progress2 + progress3 FROM debate WHERE id = ${debateId}) , schedule) AS is_active, 
      now() < schedule AS is_before, 
      TIMESTAMPADD(HOUR, ${parseInt(timeOffset) + 9}, schedule) AS time,
      TIMESTAMPADD(second, (SELECT progress1 + progress2 + progress3 FROM debate WHERE id = ${debateId}) , TIMESTAMPADD(HOUR, ${parseInt(timeOffset) + 9}, schedule)) AS end_time,
      TIMESTAMPDIFF(HOUR, now(), schedule) AS diff, 
      (SELECT name FROM debateteam WHERE id = d.agree) AS agree_team_name, 
      (SELECT name FROM debateteam WHERE id = d.disagree) AS disagree_team_name,
      (SELECT score_date FROM debate WHERE id = ${debateId}) AS score_date,
      (SELECT streamurl FROM debatestream WHERE debateid = ${debateId} AND matchid = d.matchid) AS streamurl,
      (SELECT vodurl FROM debatestream WHERE debateid = ${debateId} AND matchid = d.matchid) AS vodurl
    FROM debatetournament d
    WHERE 
      debateid = ${debateId} AND 
      round = ${round} AND
      DATE_FORMAT(TIMESTAMPADD(HOUR, ${timeOffset}, schedule), '%Y-%m-%d') = '${date}'
    ORDER BY matchid
  `
  let response = await conn.query(sql)
  
  if (response.length == 0) return res.json([])
    
  if (response[0].is_team) {
    for (let r of response) {
      sql = `SELECT userid, nickname FROM debateuser WHERE teamid = ${r.agree_team_id}`
      let agreeMember = await conn.query(sql)
      
      if (agreeMember.length != 0) {
        r.agree_user_id = []
        r.agree = []
        let ids = ''
        let teamate = ''

        for (let m of agreeMember) {
          ids += m.userid + ' '
          teamate += m.nickname + ' '
        }
        r.agree_user_id = ids
        r.agree = teamate
      }

      sql = `SELECT userid, nickname FROM debateuser WHERE teamid = ${r.disagree_team_id}`
      let disagreeMember = await conn.query(sql)
      
      if (disagreeMember.length != 0) {
        r.disagree_user_id = []
        r.disagree = []
        let teamate = ''
        let ids = ''
        
        for (let m of disagreeMember) {
          ids += m.userid + ' '
          teamate += m.nickname + ' '
        }
        r.disagree_user_id = ids
        r.disagree = teamate
      }
    }
  }

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/score-data/{debateId}:
 *    get:
 *      summary: 라운드/날짜 별 매치 획득 점수 불러오기
 *      tags: [DebateTournament]
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: round
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: date
 *          required: true
 *          schema:
 *            type: string
 *            example: '2022-10-25'
 *        - in: query
 *          name: timeOffset
 *          required: true
 *          schema:
 *            tpye: integer
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  judgenames:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: integer
 *                      agree:
 *                        type: string
 *                      disagree:
 *                        type: string
 *                      agree_judge_score:
 *                        type: integer
 *                      disagree_judge_score:
 *                        type: integer
 *                      agree_vote_score:
 *                        type: integer
 *                      disagree_vote_score:
 *                        type: integer
 *                      agree_vote_num:
 *                        type: integer
 *                      disagree_vote_num:
 *                        type: integer
 *                      time:
 *                        type: string
 *                      agree_detail:
 *                        type: object
 *                        properties:
 *                          debatejudgingid:
 *                            type: object
 *                            properties:
 *                              debatejudgingid:
 *                                type: integer
 *                              aream:
 *                                type: string
 *                              content:
 *                                type: string
 *                              percent:
 *                                type: integer
 *                              judge_name:
 *                                type: string
 *                              score:
 *                                type: integer
 *                              cal_score:
 *                                type: integer
 *                      disagree_detail:
 *                        type: object
 *                        properties:
 *                          debatejudgingid:
 *                            type: object
 *                            properties:
 *                              debatejudgingid:
 *                                type: integer
 *                              aream:
 *                                type: string
 *                              content:
 *                                type: string
 *                              percent:
 *                                type: integer
 *                              judge_name:
 *                                type: string
 *                              score:
 *                                type: integer
 *                              cal_score:
 *                                type: integer
 *        "400":
 *          description: error
 */
 app.get('/score-data/:debateId', wrapAsync(async (req,res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {round, date, timeOffset} = req.query

  let sql = `
    SELECT 
      id, matchid, agree AS agree_id, disagree AS disagree_id, 
      IF(
        (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
        (SELECT nickname FROM debateuser WHERE id = agree), 
        (SELECT name FROM debateteam WHERE id = agree)
      ) AS agree, 
      IF(
        (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
        (SELECT nickname FROM debateuser WHERE id = disagree), 
        (SELECT name FROM debateteam WHERE id = disagree)
      ) AS disagree,
      ROUND
      (
        (SELECT SUM(answer) FROM debatejudginganswer WHERE debateid = ${debateId} AND debatetournamentmatch = matchid AND debateuserid = agree) 
        * 
        ((SELECT score_to FROM debate WHERE id = ${debateId}) / 100)
      , 1) AS agree_judge_score, 
      ROUND
      (
        (SELECT SUM(answer) FROM debatejudginganswer WHERE debateid = ${debateId} AND debatetournamentmatch = matchid AND debateuserid = disagree) 
        * 
        ((SELECT score_to FROM debate WHERE id = ${debateId}) / 100)
      , 1) AS disagree_judge_score, 
      ROUND
      (
        (SELECT COUNT(id) FROM debatevote WHERE debateid = ${debateId} AND debatetournamentid = t.id AND chooseid = agree)
        *
        (100 - (SELECT score_to FROM debate WHERE id = ${debateId}))
        /
        100
        * 
        100
        /
        ((SELECT COUNT(id) FROM debatevote WHERE debateid = ${debateId} AND chooseid = agree) + (SELECT COUNT(id) FROM debatevote WHERE debateid = ${debateId} AND chooseid = disagree))
      , 1) AS agree_vote_score,  
      ROUND
      (
        (SELECT COUNT(id) FROM debatevote WHERE debateid = ${debateId} AND debatetournamentid = t.id AND chooseid = disagree)
        *
        (100 - (SELECT score_to FROM debate WHERE id = ${debateId}))
        /
        100
        * 
        100
        /
        ((SELECT COUNT(id) FROM debatevote WHERE debateid = ${debateId} AND chooseid = agree) + (SELECT COUNT(id) FROM debatevote WHERE debateid = ${debateId} AND chooseid = disagree))
      , 1) AS disagree_vote_score, 
      (SELECT COUNT(id) FROM debatevote WHERE debateid = ${debateId} AND debatetournamentid = t.id AND chooseid = agree) AS agree_vote_num, 
      (SELECT COUNT(id) FROM debatevote WHERE debateid = ${debateId} AND debatetournamentid = t.id AND chooseid = disagree) AS disagree_vote_num, 
      TIMESTAMPADD(HOUR, ${parseInt(timeOffset) + 9}, schedule) AS time
    FROM debatetournament t
    WHERE 
      debateid = ${debateId} AND 
      round = ${round} AND
      DATE_FORMAT(TIMESTAMPADD(HOUR, ${timeOffset}, schedule), '%Y-%m-%d') = '${date}'
    ORDER BY matchid
  `
  let response = await conn.query(sql)
  
  for (let r of response) {
    sql = `
      SELECT 
        debatejudgingid, 
        (SELECT aream FROM debatejudging WHERE id = debatejudgingid) AS aream, 
        (SELECT content FROM debatejudging WHERE id = debatejudgingid) AS content, 
        (SELECT percent FROM debatejudging WHERE id = debatejudgingid) AS percent,  
        (SELECT nickname FROM debatejudginguser WHERE id = debatejudginguserid) AS judge_name,  
        (answer * 5 / (SELECT percent FROM debatejudging WHERE id = debatejudgingid)) AS score, 
        answer AS cal_score
      FROM debatejudginganswer
      WHERE
        debatetournamentmatch = '${r.matchid}' AND
        debateuserid = ${r.agree_id}
    `
    let agreeDetail = await conn.query(sql)

    r.agree_detail = util.groupBy(agreeDetail, 'debatejudgingid')

    sql = `
      SELECT 
        debatejudgingid, 
        (SELECT aream FROM debatejudging WHERE id = debatejudgingid) AS aream, 
        (SELECT content FROM debatejudging WHERE id = debatejudgingid) AS content, 
        (SELECT percent FROM debatejudging WHERE id = debatejudgingid) AS percent,  
        (SELECT nickname FROM debatejudginguser WHERE id = debatejudginguserid) AS judge_name,  
        (answer * 5 / (SELECT percent FROM debatejudging WHERE id = debatejudgingid)) AS score, 
        answer AS cal_score
      FROM debatejudginganswer
      WHERE
        debatetournamentmatch = '${r.matchid}' AND
        debateuserid = ${r.disagree_id}
      ORDER BY debatejudgingid
    `
    let disagreeDetail = await conn.query(sql)

    r.disagree_detail = util.groupBy(disagreeDetail, 'debatejudgingid')
  }

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/rounds-data/{debateId}:
 *    get:
 *      summary: 라운드 데이터 가져오기
 *      tags: [DebateTournament]
 *      parameters:
 *        - in: path
 *          name: debateId
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
 *                  bracket_created:
 *                    type: integer
 *                  bracket_finalized:
 *                    type: integer
 *                  finished_round:
 *                    type: integer
 *                  recruit:
 *                    type: integer
 *        "400":
 *          description: error
 */
 app.get('/rounds-data/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params

  let sql = `SELECT bracket_created, bracket_finalized, finished_round, recruit FROM debate WHERE id = ${debateId}`
  let response = await conn.query(sql)

  res.json(response[0])
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/reschedule/{id}:
 *    post:
 *      summary: 무효경기 시간 변경
 *      tags: [DebateTournament]
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
app.post('/reschedule/:id', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {id} = req.params

  let sql = `
    SELECT 
      MAX(schedule) AS schedule,
      (SELECT debateid FROM debatetournament WHERE id = ${id}) AS debateid, 
      (SELECT match_interval FROM debate WHERE id = debateid) AS match_interval
    FROM debatetournament 
    WHERE 
      debateid = debateid AND
      round = (SELECT round FROM debatetournament WHERE id = ${id})
  `
  let result = await conn.query(sql)

  const matchInterval = result[0].match_interval
  const schedule = result[0].schedule

  sql = `SELECT progress1, progress2, progress3 FROM debate WHERE id = ${result[0].debateid}`
  result = await conn.query(sql)
  
  const matchDuration = result[0].progress1 + result[0].progress2 + result[0].progress3
  
  schedule.setSeconds(schedule.getSeconds() + (matchInterval + matchDuration))
  
  sql = `
    UPDATE debatetournament
    SET schedule = '${util.toTimeStamp(schedule)}'
    WHERE id = ${id}
  `
  await conn.query(sql)

  res.json({msg: 'success'})
}))

//Middleware
app.use(token.decodeToken)

/**
 * @swagger
 * paths:
 *  /debateTournament/manage-bracket/{debateId}:
 *    get:
 *      summary: 라운드/날짜 별 매치 리스트 가져오기 (manageBracket)
 *      tags: [DebateTournament]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: round
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: date
 *          required: true
 *          schema:
 *            type: string
 *            example: '2022-10-25'
 *        - in: query
 *          name: timeOffset
 *          required: true
 *          schema:
 *            tpye: integer
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  judgenames:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: integer
 *                      matchid:
 *                        type: string
 *                      judgelist:
 *                        type: string
 *                      subject:
 *                        type: string
 *                      win:
 *                        type: string
 *                      agree_id:
 *                        type: integer
 *                      disagree_id:
 *                        type: integer
 *                      agree:
 *                        type: string
 *                      disagree:
 *                        type: string
 *                      time:
 *                        type: string
 *                        example: hh:mm
 *                      is_team:
 *                        type: integer
 *                      agree_team_name:
 *                        type: string
 *                      disagree_team_name:
 *                        type: string
 *        "400":
 *          description: error
 */
app.get('/manage-bracket/:debateId', wrapAsync(async (req,res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {round, date, timeOffset} = req.query

  let sql = `
    SELECT 
      id, judgelist, subject, win, agree, disagree, 
      TIMESTAMPADD(HOUR, ${parseInt(timeOffset) + 9}, schedule) AS time, 
      IF(
        (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 0, 1
      ) AS is_team
    FROM debatetournament  
    WHERE 
      debateid = ${debateId} AND 
      round = ${round} AND
      DATE_FORMAT(TIMESTAMPADD(HOUR, ${timeOffset}, schedule), '%Y-%m-%d') = '${date}'
    ORDER BY matchid
  `
  let response = await conn.query(sql)
  
  if (response.length == 0) return res.json([])

  for (r of response) {
    sql = `SELECT nickname FROM debatejudginguser WHERE id IN(${r.judgelist})`
    let judges = await conn.query(sql)
    
    const judgeNames = judges.map((j) => j.nickname)
    r.judgenames = judgeNames

    if (r.is_team == 0) {
      if (r.agree != null) {
        sql = `SELECT id, nickname, (SELECT id FROM debatetournament WHERE id = ${r.id}) AS tournament_id FROM debateuser WHERE id = ${r.agree}`
        let agree = await conn.query(sql)

        r.agree = agree[0]
      
      } else {
        r.agree =[]
      }

      if (r.disagree != null) {
        sql = `SELECT id, nickname, (SELECT id FROM debatetournament WHERE id = ${r.id}) AS tournament_id FROM debateuser WHERE id = ${r.disagree}`
        let disagree = await conn.query(sql)

        r.disagree = disagree[0]
      
      } else {
        r.disagree = []
      }
    }

    else {
      sql = `SELECT id, name AS nickname, (SELECT id FROM debatetournament WHERE id = ${r.id}) AS tournament_id FROM debateteam WHERE id = ${r.agree}`
      let agree = await conn.query(sql)

      if (agree.length != 0) {
        sql = `SELECT nickname FROM debateuser WHERE teamid = ${agree[0].id}`
        let agreeNick = await conn.query(sql)

        const agreeNicknames = agreeNick.map((a) => a.nickname)
        agree[0].usernicks = agreeNicknames
        r.agree = agree[0]
      
      } else {
        r.agree = []
      }

      sql = `SELECT id, name AS nickname, (SELECT id FROM debatetournament WHERE id = ${r.id}) AS tournament_id FROM debateteam WHERE id = ${r.disagree}`
      let disagree = await conn.query(sql)

      if (disagree.length != 0) {
        sql = `SELECT nickname FROM debateuser WHERE teamid = ${disagree[0].id}`
        let disagreeNick = await conn.query(sql)

        const disagreeNicknames = disagreeNick.map((d) => d.nickname)
        disagree[0].usernicks = disagreeNicknames
        r.disagree = disagree[0]

      } else {
        r.disagree = []
      }
    }
  }

  res.json(util.groupBy(response, 'judgenames'))
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/edit/{debateId}:
 *    post:
 *      summary: 대진표 수정
 *      tags: [DebateTournament]
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
 *                data:
 *                  type: object
 *                  properties:
 *                    judgeGroups:
 *                      type: object
 *                    timeTables:
 *                      type: object
 *                      properties:
 *                        id:
 *                          type: integer
 *                        proTeam:
 *                          type: object
 *                        conTeam:
 *                          type: object
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/edit/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {data} = req.body
  let idx = 0

  for (let g of data.judgeGroups) {

    for (let i in g) {
      g[i] = JSON.stringify(g[i])
    }

    let sql = `SELECT id FROM debatejudginguser WHERE debateid = ${debateId} AND nickname IN(${g})`
    let result = await conn.query(sql)
    
    const judgeList = result.map((r) => r.id)

    for (let t of data.timeTables[idx]) {
      sql = `
        UPDATE debatetournament 
        SET
          agree = ${t.proTeam.id}, 
          disagree = ${t.conTeam.id}, 
          judgelist = '${judgeList}',
          user1 = IF(
            (SELECT freedom_to FROM debate WHERE id = (SELECT debateid FROM (SELECT debateid FROM debatetournament WHERE id = ${t.id}) A)) = 0,
            ${t.proTeam.id},
            (SELECT userid FROM debateuser WHERE id = (SELECT MIN(id) FROM debateuser WHERE teamid = ${t.proTeam.id} ORDER BY id))
          ),
          user2 = IF(
            (SELECT freedom_to FROM debate WHERE id = (SELECT debateid FROM (SELECT debateid FROM debatetournament WHERE id = ${t.id}) A)) = 0,
            '',
            (SELECT userid FROM debateuser WHERE id = (SELECT id FROM debateuser WHERE teamid = ${t.proTeam.id} ORDER BY id LIMIT 1, 1))
          ),
          user3 = IF(
            (SELECT freedom_to FROM debate WHERE id = (SELECT debateid FROM (SELECT debateid FROM debatetournament WHERE id = ${t.id}) A)) <= 1,
            '',
            (SELECT userid FROM debateuser WHERE id = (SELECT MAX(id) FROM debateuser WHERE teamid = ${t.proTeam.id} ORDER BY id))
          ),
          user4 = IF(
            (SELECT freedom_to FROM debate WHERE id = (SELECT debateid FROM (SELECT debateid FROM debatetournament WHERE id = ${t.id}) A)) = 0,
            ${t.conTeam.id},
            (SELECT userid FROM debateuser WHERE id = (SELECT MIN(id) FROM debateuser WHERE teamid = ${t.conTeam.id} ORDER BY id))
          ),
          user5 = IF(
            (SELECT freedom_to FROM debate WHERE id = (SELECT debateid FROM (SELECT debateid FROM debatetournament WHERE id = ${t.id}) A)) = 0,
            '',
            (SELECT userid FROM debateuser WHERE id = (SELECT id FROM debateuser WHERE teamid = ${t.conTeam.id} ORDER BY id LIMIT 1, 1))
          ),
          user6 = IF(
            (SELECT freedom_to FROM debate WHERE id = (SELECT debateid FROM (SELECT debateid FROM debatetournament WHERE id = ${t.id}) A)) <= 1,
            '',
            (SELECT userid FROM debateuser WHERE id = (SELECT MAX(id) FROM debateuser WHERE teamid = ${t.conTeam.id} ORDER BY id))
          ) 
        WHERE
          id = ${t.id}
      `
      await conn.query(sql)
    }
    idx++
  }

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/random/{debateId}:
 *    post:
 *      summary: 랜덤 대진표 생성
 *      tags: [DebateTournament]
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
 *                subject:
 *                  type: string
 *                  required: true
 *                roundStart:
 *                  type: string
 *                  required: true
 *                dayStart:
 *                  type: string
 *                  required: true
 *                dayEnd:
 *                  type: string
 *                  required: true
 *                interval:
 *                  type: integer
 *                  required: true
 *                breakTime:
 *                  type: object
 *                  properties:
 *                    start:
 *                      type: array
 *                      items:
 *                        type: string
 *                    end:
 *                      type: array
 *                      items:
 *                        type: string
 *                judgeTeamNum:
 *                  type: integer
 *                  required: true
 *                timeOffset:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/random/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {subject, roundStart, dayStart, dayEnd, interval, breakTime, judgeTeamNum, timeOffset} = req.body
  const judgeTeam = Array.from(Array(judgeTeamNum), () => new Array())
  let response = {msg: 'success', tournamentIds: []}

  let sql = `SELECT progress1, progress2, progress3 FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)
  
  const matchDuration = result[0].progress1 + result[0].progress2 + result[0].progress3

  sql = `SELECT id FROM debatejudginguser WHERE debateid = ${debateId} AND accept = 1 AND status = 0`
  const judgeList = await conn.query(sql)

  const shuffledJudge = judgeList.sort(() => Math.random() - 0.5)

  sql = `UPDATE debate SET match_interval = ${interval} WHERE id = ${debateId}`
  await conn.query(sql)

  sql = `SELECT id FROM debatetournament WHERE debateid = ${debateId}`
  result = await conn.query(sql)

  if (result.length != 0) {
    sql = `DELETE FROM debatetournament WHERE debateid = ${debateId}`
    await conn.query(sql)
  }

  let ds = new Date(roundStart + 'T' + dayStart + ':00.000Z')
  let de = new Date(roundStart + 'T' + dayEnd + ':00.000Z')
  let schedule = new Date(ds)
  schedule.setHours(schedule.getHours() - timeOffset)

  let teamIdx = 0

  for (let i in shuffledJudge) {
    judgeTeam[teamIdx].push(shuffledJudge[i].id)
    teamIdx++
    if (teamIdx == judgeTeamNum) teamIdx = 0  
  }

  sql = `SELECT freedom_to FROM debate WHERE id = ${debateId}`    
  result = await conn.query(sql)

  sql = `
          SELECT id, (SELECT schedule_to FROM debate WHERE id = ${debateId}) AS schedule_to 
          FROM ${result[0].freedom_to == 0 ? 'debateuser' : 'debateteam'} 
          WHERE debateid = ${debateId} AND status = 2
        `
  result = await conn.query(sql)

  if (result.length == 0) return res.json({msg: 'participants not exist'})
          
  const ids = result.map((r) => r.id)
  const shuffled = ids.sort(() => Math.random() - 0.5)

  if (util.isSquareNum(shuffled.length)) {
    const bin = (shuffled.length).toString(2)
    const roundCount = bin.length - 1

    for (let i = 0; i < roundCount; i++) {
      let matchIndex = 1
      let judgeTeamIdx = 0
      for (let j = 0; j < shuffled.length / (i == 0 ? 1 : 2**i); j+=2) {
        sql = 
          `
            INSERT INTO debatetournament(debateid, agree, disagree, round, subject, matchid, judgelist, schedule, user1, user2, user3, user4, user5, user6)
            VALUES(
              ${debateId}, 
              ${i == 0 ? shuffled[j]  : -1}, 
              ${i == 0 ? shuffled[j+1]  : -1}, 
              ${i+1}, 
              '${i == 0 ? subject : ''}', 
              '${String(i+1) + '-' + String(matchIndex)}', 
              '${i == 0 ? judgeTeam[judgeTeamIdx] : ''}', 
              '${i == 0 ? util.toTimeStamp(schedule) : '0000-00-00 00:00:00'}', 
              IF(
                ${i} = 0, 
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
                  (SELECT userid FROM debateuser WHERE id = ${shuffled[j]}), 
                  (SELECT userid FROM debateuser WHERE id = (SELECT MIN(id) FROM debateuser WHERE teamid = ${shuffled[j]} ORDER BY id))
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
                  '', 
                  (SELECT userid FROM debateuser WHERE id = (SELECT id FROM debateuser WHERE teamid = ${shuffled[j]} ORDER BY id LIMIT 1, 1))
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) <= 1,
                  '',
                  (SELECT userid FROM debateuser WHERE id = (SELECT MAX(id) FROM debateuser WHERE teamid = ${shuffled[j]} ORDER BY id)) 
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
                  (SELECT userid FROM debateuser WHERE id = ${shuffled[j+1]}), 
                  (SELECT userid FROM debateuser WHERE id = (SELECT MIN(id) FROM debateuser WHERE teamid = ${shuffled[j+1]} ORDER BY id))
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
                  '', 
                  (SELECT userid FROM debateuser WHERE id = (SELECT id FROM debateuser WHERE teamid = ${shuffled[j+1]} ORDER BY id LIMIT 1, 1))
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) <= 1,
                  '',
                  (SELECT userid FROM debateuser WHERE id = (SELECT MAX(id) FROM debateuser WHERE teamid = ${shuffled[j+1]} ORDER BY id)) 
                ),
                ''
              )
            )
          `
        await conn.query(sql)
        
        matchIndex++
        
        if (judgeTeamIdx == judgeTeamNum - 1) {
          schedule.setSeconds(schedule.getSeconds() + (interval + matchDuration))
        }

        for (let k = 0; k < breakTime.start.length; k++) {
          const breakStart = new Date(schedule.getFullYear() + '-' + util.getFullMonth(schedule.getMonth()) + '-' + util.getFullDate(schedule.getDate()) + 'T' + breakTime.start[k] + ':00.000Z')
          const breakEnd = new Date(schedule.getFullYear() + '-' + util.getFullMonth(schedule.getMonth()) + '-' + util.getFullDate(schedule.getDate()) + 'T' + breakTime.end[k] + ':00.000Z')

          breakStart.setHours(breakStart.getHours() - timeOffset)
          breakEnd.setHours(breakEnd.getHours() - timeOffset)

          if (breakStart <= schedule && schedule <= breakEnd || breakStart.getTime() <= schedule.getTime() + (matchDuration * 1000) && schedule.getTime() + (matchDuration * 1000) <= breakEnd.getTime()) {
            schedule = breakEnd
          }
        }

        if (schedule.getTime() + (matchDuration * 1000) > de.getTime()) {
          ds.setDate(ds.getDate() + 1)
          de.setDate(de.getDate() + 1)
          schedule = new Date(ds)
        }

        judgeTeamIdx++
        if (judgeTeamIdx == judgeTeamNum) judgeTeamIdx = 0
      }

      if (result[0].schedule_to == 1 && i == roundCount - 1) {
        sql = `
          INSERT INTO debatetournament(debateid, round, subject, matchid, judgelist, schedule, user1, user2, user3, user4, user5, user6)
          VALUES(
            ${debateId}, 
            ${i+1},
            '', 
            '${String(i+1) + '-2'}', 
            '', 
            '${'0000-00-00 00:00:00'}',
            '',
            '',
            '',
            '',
            '',
            ''
          )
        `
        await conn.query(sql)
      }
    }
  }

  else {
    const bin = (shuffled.length).toString(2)
    const roundCount = bin.length
    const extraCount = shuffled.length - (2**(roundCount - 1))
    const squareNum = shuffled.length - extraCount
    
    for (let i of roundCount) {
      let matchIndex = 1
      let judgeTeamIdx = 0
      for (let j = 0; j < (i == 0 ? extraCount * 2 : squareNum / (i == 1 ? 1 : 2**(i-1))); j+=2) {
        sql = 
          `
            INSERT INTO debatetournament(debateid, agree, disagree, round, subject, matchid, judgelist, schedule, user1, user2, user3, user4, user5, user6)
            VALUES(
              ${debateId},
              ${i == 0 ? shuffled[j] : i == 1 ? (j + extraCount < squareNum ? shuffled[j + (extraCount * 2)] : null) : null},
              ${i == 0 ? shuffled[j+1] : i == 1 ? (j+1 + extraCount < squareNum ? shuffled[j+1 + (extraCount * 2)] : null) : null},
              ${i+1}, 
              '${i == 0 ? subject : ''}', 
              '${String(i+1) + '-' + String(matchIndex)}', 
              '${i == 0 ? judgeTeam[judgeTeamIdx] : ''}', 
              '${i == 0 ? util.toTimeStamp(schedule) : '0000-00-00 00:00:00'}', 
              IF(
                ${i} = 0, 
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
                  (SELECT userid FROM debateuser WHERE id = ${shuffled[j]}), 
                  (SELECT userid FROM debateuser WHERE id = (SELECT MIN(id) FROM debateuser WHERE teamid = ${shuffled[j]} ORDER BY id))
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
                  '', 
                  (SELECT userid FROM debateuser WHERE id = (SELECT id FROM debateuser WHERE teamid = ${shuffled[j]} ORDER BY id LIMIT 1, 1))
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) <= 1,
                  '',
                  (SELECT userid FROM debateuser WHERE id = (SELECT MAX(id) FROM debateuser WHERE teamid = ${shuffled[j]} ORDER BY id)) 
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
                  (SELECT userid FROM debateuser WHERE id = ${shuffled[j+1]}), 
                  (SELECT userid FROM debateuser WHERE id = (SELECT MIN(id) FROM debateuser WHERE teamid = ${shuffled[j+1]} ORDER BY id))
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
                  '', 
                  (SELECT userid FROM debateuser WHERE id = (SELECT id FROM debateuser WHERE teamid = ${shuffled[j+1]} ORDER BY id LIMIT 1, 1))
                ),
                ''
              ),
              IF(
                ${i} = 0,
                IF(
                  (SELECT freedom_to FROM debate WHERE id = ${debateId}) <= 1,
                  '',
                  (SELECT userid FROM debateuser WHERE id = (SELECT MAX(id) FROM debateuser WHERE teamid = ${shuffled[j+1]} ORDER BY id)) 
                ),
                ''
              )
            )
          `
        await conn.query(sql)
        matchIndex++

        if (judgeTeamIdx == judgeTeamNum - 1) {
          schedule.setSeconds(schedule.getSeconds() + (interval + matchDuration))
        }

        for (let k = 0; k < breakTime.start.length; k++) {
          const breakStart = new Date(schedule.getFullYear() + '-' + util.getFullMonth(schedule.getMonth()) + '-' + util.getFullDate(schedule.getDate()) + 'T' + breakTime.start[k] + ':00.000Z')
          const breakEnd = new Date(schedule.getFullYear() + '-' + util.getFullMonth(schedule.getMonth()) + '-' + util.getFullDate(schedule.getDate()) + 'T' + breakTime.end[k] + ':00.000Z')

          breakStart.setHours(breakStart.getHours() - timeOffset)
          breakEnd.setHours(breakEnd.getHours() - timeOffset)

          if (breakStart <= schedule && schedule <= breakEnd || breakStart.getTime() <= schedule.getTime() + (matchDuration * 1000) && schedule.getTime() + (matchDuration * 1000) <= breakEnd.getTime()) {
            schedule = breakEnd
          }
        }

        if (schedule.getTime() + (matchDuration * 1000) > de.getTime()) {
          ds.setDate(ds.getDate() + 1)
          de.setDate(de.getDate() + 1)
          schedule = new Date(ds)
        }

        judgeTeamIdx++
        if (judgeTeamIdx == judgeTeamNum) judgeTeamIdx = 0
      }

      if (result[0].schedule_to == 1 && i == roundCount - 1) {
        sql = `
          INSERT INTO debatetournament(debateid, round, subject, matchid, judgelist, schedule, user1, user2, user3, user4, user5, user6)
          VALUES(
            ${debateId}, 
            ${i+1},
            '', 
            '${String(i+1) + '-2'}', 
            '', 
            '${'0000-00-00 00:00:00'}',
            '',
            '',
            '',
            '',
            '',
            ''
          )
        `
        await conn.query(sql)
      }
    }
  }
  
  sql = `DELETE FROM debatestream WHERE debateid = ${debateId}`
  result = await conn.query(sql)
  
  sql = `SELECT id, matchid FROM debatetournament WHERE debateid = ${debateId}`
  result = await conn.query(sql)

  for (let r of result) {
    response.tournamentIds.push(r.id)

    const streamKey = uuid.v4()

    const sql = `
      INSERT INTO debatestream(debateid, matchid, streamkey) 
      VALUES(${debateId}, '${r.matchid}', '${streamKey}')
    `
    await conn.query(sql)
  }

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/match-result/{debateId}:
 *    post:
 *      summary: 매치 결과 처리
 *      tags: [DebateTournament]
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
 *                matchId:
 *                  type: string
 *                  required: true
 *                winnerId:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/match-result/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {matchId, winnerId} = req.body

  let sql = `UPDATE debatetournament SET win = ${winnerId} WHERE debateid = ${debateId} AND matchid = '${matchId}'`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/next-round/{debateId}:
 *    post:
 *      summary: 다음 라운드 대진표 작성
 *      tags: [DebateTournament]
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
 *                currentRound:
 *                  type: integer
 *                  required: true
 *                subject:
 *                  type: string
 *                  required: true
 *                roundStart:
 *                  type: string
 *                  required: true
 *                dayStart:
 *                  type: string
 *                  required: true
 *                dayEnd:
 *                  type: string
 *                  required: true
 *                interval:
 *                  type: integer
 *                  required: true
 *                breakTime:
 *                  type: object
 *                  properties:
 *                    start:
 *                      type: array
 *                      items:
 *                        type: string
 *                    end:
 *                      type: array
 *                      items:
 *                        type: string
 *                judgeTeamNum:
 *                  type: integer
 *                  required: true
 *                timeOffset:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
app.post('/next-round/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {currentRound, subject, roundStart, dayStart, dayEnd, interval, breakTime, judgeTeamNum, timeOffset} = req.body
  const judgeTeam = Array.from(Array(judgeTeamNum), () => new Array())

  let sql = `SELECT progress1, progress2, progress3 FROM debate WHERE id = ${debateId}`
  let result = await conn.query(sql)
  
  const matchDuration = result[0].progress1 + result[0].progress2 + result[0].progress3

  sql = `SELECT id FROM debatejudginguser WHERE debateid = ${debateId} AND accept = 1 AND status = 0`
  const judgeList = await conn.query(sql)

  const shuffledJudge = judgeList.sort(() => Math.random() - 0.5)

  let ds = new Date(roundStart + 'T' + dayStart + ':00.000Z')
  let de = new Date(roundStart + 'T' + dayEnd + ':00.000Z')
  let schedule = new Date(ds)
  schedule.setHours(schedule.getHours() - timeOffset)

  let teamIdx = 0
  for (let i = 0; i < shuffledJudge.length; i++) {
    judgeTeam[teamIdx].push(shuffledJudge[i].id)
    teamIdx++
    if (teamIdx == judgeTeamNum) teamIdx = 0  
  }

  sql = `
    SELECT 
      agree, disagree, matchid, win, 
      (SELECT schedule_to FROM debate WHERE id = ${debateId}) AS schedule_to, 
      (SELECT MAX(round) FROM debatetournament WHERE debateid = ${debateId}) AS max_round, 
      IF(
        (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
        (SELECT COUNT(*) FROM debateuser WHERE debateid = ${debateId}),
        (SELECT COUNT(*) FROM debateteam WHERE debateid = ${debateId})
      ) AS participant_count 
    FROM debatetournament 
    WHERE debateid = ${debateId} AND round = ${currentRound}
  `
  result = await conn.query(sql)

  let judgeTeamIdx = 0
  const max_round = result[0].max_round

  sql = `SELECT id FROM debatetournament WHERE debateid = ${debateId} AND round = ${currentRound+1} AND agree != -1 AND disagree = -1`
  result = await conn.query(sql)

  const disagreeEmptyIds = result.map((r) => r.id)

  sql = `SELECT id FROM debatetournament WHERE debateid = ${debateId} AND round = ${currentRound+1} AND agree = -1 AND disagree = -1 AND matchid != '${max_round + '-2'}'`
  result = await conn.query(sql)

  const bothEmptyIds = result.map((r) => r.id)

  sql = `SELECT win FROM debatetournament WHERE debateid = ${debateId} AND round = ${currentRound}`
  result = await conn.query(sql)

  const winners = result.map((r) => r.win)
  
  if (disagreeEmptyIds.length != 0) {
    sql = `
      UPDATE debatetournament
      SET disagree = ${winners[0]} 
      WHERE id = ${disagreeEmptyIds[0]}
    `
    await conn.query(sql)
    
    let wIdx = 1

    for (let r of bothEmptyIds) {
      const side = Math.floor(Math.random() * 2) + 1

      sql = `
        UPDATE debatetournament
        SET agree = ${side == 1 ? winners[wIdx] : winners[wIdx+1]}, disagree = ${side == 1 ? winners[wIdx+1] : winners[wIdx]} 
        WHERE id = ${r}
      `
      await conn.query(sql)
      
      wIdx+=2
    }
  } 
  
  else {
    let wIdx = 0
    
    for (let r of bothEmptyIds) {
      const side = Math.floor(Math.random() * 2) + 1

      sql = `
        UPDATE debatetournament
        SET agree = ${side == 1 ? winners[wIdx] : winners[wIdx+1]}, disagree = ${side == 1 ? winners[wIdx+1] : winners[wIdx]} 
        WHERE id = ${r}
      `
      await conn.query(sql)
      
      wIdx+=2
    }
  }

  sql = `SELECT id FROM debatetournament WHERE debateid = ${debateId} AND round = ${currentRound+1}`
  result = await conn.query(sql)

  for (let r of result) {
    sql = `
      UPDATE debatetournament 
      SET 
        judgelist = '${judgeTeam[judgeTeamIdx]}', 
        schedule = '${util.toTimeStamp(schedule)}', 
        subject = '${subject}' 
      WHERE id = ${r.id}
    ` 

    await conn.query(sql)
    
    sql = `
      UPDATE debatetournament
      SET
        win = IF(
          (
            SELECT agree 
            FROM debatetournament 
            WHERE id = ${r.id}
          ) IS NULL
          OR
          (
            SELECT disagree 
            FROM debatetournament 
            WHERE id = ${r.id}
          ) IS NULL,
          IF(
            (
              SELECT agree 
              FROM debatetournament 
              WHERE id = ${r.id}
            ) IS NULL,
            disagree,
            agree
          ),
          NULL
        ), 
        user1 = IF(
          (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
          (
            SELECT userid FROM debateuser WHERE id = (
              SELECT agree 
              FROM debatetournament 
              WHERE id = ${r.id}
            )
          ), 
          (
            SELECT userid FROM debateuser WHERE id = (
              SELECT MIN(id) FROM debateuser WHERE teamid = (
                SELECT agree 
                FROM debatetournament 
                WHERE id = ${r.id}
              ) ORDER BY id
            )
          )
        ),
        user2 = IF(
          (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
          '', 
          (
            SELECT userid FROM debateuser WHERE id = (
              SELECT id FROM debateuser WHERE teamid = (
                SELECT agree 
                FROM debatetournament 
                WHERE id = ${r.id}
              ) ORDER BY id LIMIT 1, 1
            )
          )
        ),
        user3 = IF(
          (SELECT freedom_to FROM debate WHERE id = ${debateId}) <= 1, 
          '', 
          (
            SELECT userid FROM debateuser WHERE id = (
              SELECT MAX(id) FROM debateuser WHERE teamid = (
                SELECT agree 
                FROM debatetournament 
                WHERE id = ${r.id}
              ) ORDER BY id
            )
          )
        ),
        user4 = IF(
          (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
          (
            SELECT userid FROM debateuser WHERE id = (
              SELECT disagree 
              FROM debatetournament 
              WHERE id = ${r.id}
            )
          ), 
          (
            SELECT userid FROM debateuser WHERE id = (
              SELECT MIN(id) FROM debateuser WHERE teamid = (
                SELECT disagree 
                FROM debatetournament 
                WHERE id = ${r.id}
              ) ORDER BY id
            )
          )
        ),
        user5 = IF(
          (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
          '', 
          (
            SELECT userid FROM debateuser WHERE id = (
              SELECT id FROM debateuser WHERE teamid = (
                SELECT disagree 
                FROM debatetournament 
                WHERE id = ${r.id}
              ) ORDER BY id LIMIT 1, 1
            )
          )
        ),
        user6 = IF(
          (SELECT freedom_to FROM debate WHERE id = ${debateId}) <= 1, 
          '', 
          (
            SELECT userid FROM debateuser WHERE id = (
              SELECT MAX(id) FROM debateuser WHERE teamid = (
                SELECT disagree 
                FROM debatetournament 
                WHERE id = ${r.id}
              ) ORDER BY id
            )
          )
        )
      WHERE id = ${r.id}
    `
    await conn.query(sql)

    if (judgeTeamIdx == judgeTeamNum - 1) {
      schedule.setSeconds(schedule.getSeconds() + (interval + matchDuration))
    }

    for (let k = 0; k < breakTime.start.length; k++) {
      const breakStart = new Date(schedule.getFullYear() + '-' + util.getFullMonth(schedule.getMonth()) + '-' + util.getFullDate(schedule.getDate()) + 'T' + breakTime.start[k] + ':00.000Z')
      const breakEnd = new Date(schedule.getFullYear() + '-' + util.getFullMonth(schedule.getMonth()) + '-' + util.getFullDate(schedule.getDate()) + 'T' + breakTime.end[k] + ':00.000Z')

      breakStart.setHours(breakStart.getHours() - timeOffset)
      breakEnd.setHours(breakEnd.getHours() - timeOffset)

      if (breakStart <= schedule && schedule <= breakEnd || breakStart.getTime() <= schedule.getTime() + (matchDuration * 1000) && schedule.getTime() + (matchDuration * 1000) <= breakEnd.getTime()) {
        schedule = breakEnd
      }
    }

    if (schedule.getTime() + (matchDuration * 1000) > de.getTime()) {
      ds.setDate(ds.getDate() + 1)
      de.setDate(de.getDate() + 1)
      schedule = new Date(ds)
    }

    judgeTeamIdx++
    if (judgeTeamIdx == judgeTeamNum) judgeTeamIdx = 0
  }

  sql = `
    SELECT 
      (SELECT schedule_to FROM debate WHERE id = ${debateId}) AS schedule_to, 
      (SELECT MAX(round) FROM debatetournament WHERE debateid = ${debateId}) AS max_round
    FROM debatetournament 
    WHERE debateid = ${debateId} AND round = ${currentRound}
  `
  result = await conn.query(sql)

  if (result[0].schedule_to == 1 && currentRound + 1 == result[0].max_round) {
    sql = `
      SELECT agree, disagree, win
      FROM debatetournament 
      WHERE debateid = ${debateId} AND round = ${currentRound}
    `
    result = await conn.query(sql)
    
    let idx = 1
    let side

    for (let r of result) {
      idx % 2 != 0 ? side = Math.floor(Math.random() * 2) + 1 : side == 1 ? side = 2 : side = 1
      let defeated
      r.win == r.agree ? defeated = r.disagree : defeated = r.agree

      sql = `
        UPDATE debatetournament 
        SET 
          ${side == 1 ? 'agree' : 'disagree'} = ${defeated}, 
          subject = '${subject}', 
          judgelist = '${judgeTeam[judgeTeamIdx]}', 
          schedule = '${util.toTimeStamp(schedule)}' 
        WHERE 
          debateid = ${debateId} AND  
          matchid = '${String(currentRound + 1) + '-2'}'
      `
      await conn.query(sql)
      
      sql = `
        UPDATE debatetournament
        SET
          user1 = IF(
            (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
            (
              SELECT userid FROM debateuser WHERE id = (
                SELECT agree 
                FROM debatetournament 
                WHERE debateid = ${debateId} AND 
                matchid = '${String(currentRound + 1) + '-2'}'
              )
            ), 
            (
              SELECT userid FROM debateuser WHERE id = (
                SELECT MIN(id) FROM debateuser WHERE teamid = (
                  SELECT agree 
                  FROM debatetournament 
                  WHERE debateid = ${debateId} AND 
                  matchid = '${String(currentRound + 1) + '-2'}'
                ) ORDER BY id
              )
            )
          ),
          user2 = IF(
            (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
            '', 
            (
              SELECT userid FROM debateuser WHERE id = (
                SELECT id FROM debateuser WHERE teamid = (
                  SELECT agree 
                  FROM debatetournament 
                  WHERE debateid = ${debateId} AND 
                  matchid = '${String(currentRound + 1) + '-2'}'
                ) ORDER BY id LIMIT 1, 1
              )
            )
          ),
          user3 = IF(
            (SELECT freedom_to FROM debate WHERE id = ${debateId}) <= 1, 
            '', 
            (
              SELECT userid FROM debateuser WHERE id = (
                SELECT MAX(id) FROM debateuser WHERE teamid = (
                  SELECT agree 
                  FROM debatetournament 
                  WHERE debateid = ${debateId} AND 
                  matchid = '${String(currentRound + 1) + '-2'}'
                ) ORDER BY id
              )
            )
          ),
          user4 = IF(
            (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
            (
              SELECT userid FROM debateuser WHERE id = (
                SELECT disagree 
                FROM debatetournament 
                WHERE debateid = ${debateId} AND 
                matchid = '${String(currentRound + 1) + '-2'}'
              )
            ), 
            (
              SELECT userid FROM debateuser WHERE id = (
                SELECT MIN(id) FROM debateuser WHERE teamid = (
                  SELECT disagree 
                  FROM debatetournament 
                  WHERE debateid = ${debateId} AND 
                  matchid = '${String(currentRound + 1) + '-2'}'
                ) ORDER BY id
              )
            )
          ),
          user5 = IF(
            (SELECT freedom_to FROM debate WHERE id = ${debateId}) = 0, 
            '', 
            (
              SELECT userid FROM debateuser WHERE id = (
                SELECT id FROM debateuser WHERE teamid = (
                  SELECT disagree 
                  FROM debatetournament 
                  WHERE debateid = ${debateId} AND 
                  matchid = '${String(currentRound + 1) + '-2'}'
                ) ORDER BY id LIMIT 1, 1
              )
            )
          ),
          user6 = IF(
            (SELECT freedom_to FROM debate WHERE id = ${debateId}) <= 1, 
            '', 
            (
              SELECT userid FROM debateuser WHERE id = (
                SELECT MAX(id) FROM debateuser WHERE teamid = (
                  SELECT disagree FROM debatetournament 
                  WHERE debateid = ${debateId} AND 
                  matchid = '${String(currentRound + 1) + '-2'}'
                ) ORDER BY id
              )
            )
          )
        WHERE
          debateid = ${debateId} AND  
          matchid = '${String(currentRound + 1) + '-2'}'
      `
      await conn.query(sql)
      idx++
    }
  } 
  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/set-bracket-created/{debateId}:
 *    post:
 *      summary: 대진표 생성된 라운드 업데이트
 *      tags: [DebateTournament]
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
 *                round:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/set-bracket-created/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {round} = req.body

  let sql = `UPDATE debate SET bracket_created = ${round} WHERE id = ${debateId}`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/set-bracket-finalized/{debateId}:
 *    post:
 *      summary: 대진표 작성 최종 완료된 라운드 업데이트
 *      tags: [DebateTournament]
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
 *                round:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/set-bracket-finalized/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {round} = req.body

  let sql = `UPDATE debate SET bracket_finalized = ${round} WHERE id = ${debateId}`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/finalize-round/{debateId}:
 *    post:
 *      summary: 라운드 확정
 *      tags: [DebateTournament]
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
 *                round:
 *                  type: integer
 *                  required: true
 *      responses:
 *        "200":
 *          description: success
 *        "400":
 *          description: error
 */
 app.post('/finalize-round/:debateId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId} = req.params
  const {round} = req.body

  let sql = `UPDATE debate SET finished_round = ${round} WHERE id = ${debateId}`
  await conn.query(sql)

  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/filelist/detail/{debateTournamentId}:
 *    get:
 *      summary: 파일 리스트 불러오기
 *      tags: [DebateTournament]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateTournamentId
 *          required: true
 *          schema:
 *            type: integer
 *      responses:
 *        200:
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    filename:
 *                      type: string
 *                    size:
 *                      type: integer
 *        400:
 *          description: error
 */
app.get('/filelist/detail/:debateTournamentId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateTournamentId} = req.params
  let response = []
  
  let sql = `SELECT filenamelist FROM debatetournament WHERE id = ${debateTournamentId}`
  let result = await conn.query(sql)

  if (result[0].filenamelist != undefined) {
    const filename = result[0].filenamelist.split(',')
    
    for (let i = 0; i < filename.length-1; i++) {
      let responseJson = {}
      
      responseJson.filename = filename[i]+`.pdf`
      responseJson.size = fs.statSync(`../debateClubServer/public/debateTournament/${debateTournamentId}/`+filename[i]+`.pdf`).size

      response.push(responseJson)
    }
  }
  
  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/filenamelist/update/{debateTournamentId}:
 *    patch:
 *      summary: 파일 리스트 업로드 수정
 *      tags: [DebateTournament]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateTournamentId
 *          required: true
 *          schema:
 *            type: integer
 *      requestBody: 
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                filenamelist:
 *                  type: string
 *      responses:
 *        200:
 *          description: success
 *        400:
 *          description: error
 */
app.patch('/filenamelist/update/:debateTournamentId', wrapAsync(async (req, res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateTournamentId} = req.params
  const {filenamelist} = req.body
  
  let sql = `UPDATE debatetournament SET filenamelist=NULLIF('${filenamelist}', '') WHERE id=${debateTournamentId}`
  await conn.query(sql)
  
  res.json({msg: 'success'})
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/result-round-data/{debateId}/{round}:
 *    get:
 *      summary: 라운드 별 결과 데이터
 *      tags: [DebateTournament]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *        - in: path
 *          name: round
 *          required: true
 *          schema:
 *            tpye: integer
 *        - in: query
 *          name: timeOffset
 *          required: true
 *          schema:
 *            tpye: integer
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  dates:
 *                    type: array
 *                    items:
 *                      type: string
 *                  numMatches:
 *                    type: array
 *                    items:
 *                      type: integer
 *                  judgingData:
 *                    type: object
 *                    properties:
 *                      area:
 *                        type: string
 *                      content:
 *                        type: string
 *                      percentage:
 *                        type: integer
 *                  votePercentage:
 *                    type: integer
 *        "400":
 *          description: error
 */
app.get('/result-round-data/:debateId/:round', wrapAsync(async (req,res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, round} = req.params
  const {timeOffset} = req.query
  
  let response = {
    dates: [],
    numMatches: [],
    judgingData: [],
    votePercentage: 0
  }

  let sql = `
    SELECT 
      DATE_FORMAT(TIMESTAMPADD(HOUR, ${timeOffset}, schedule), '%Y-%m-%d') AS dates, 
      COUNT(matchid) AS count
    FROM debatetournament 
    WHERE debateid = ${debateId} AND round = ${round}
    GROUP BY dates
  `
  let result = await conn.query(sql)

  response.dates = result.map((r) => r.dates)
  response.numMatches = result.map((r) => r.count)

  sql = `
    SELECT aream, content, percent
    FROM debatejudging
    WHERE debateid = ${debateId} AND status = 0
    ORDER BY aream
  `
  result = await conn.query(sql)

  result.forEach((r) => {
    const judgingData = {
      area: r.aream,
      content: r.content,
      percentage: r.percent
    }

    response.judgingData.push(judgingData)
  })

  sql = `SELECT score_to FROM debate WHERE id = ${debateId}`
  result = await conn.query(sql)

  response.votePercentage = result[0].score_to

  res.json(response)
}))

/**
 * @swagger
 * paths:
 *  /debateTournament/result-data/{debateId}/{round}/{date}:
 *    get:
 *      summary: 일별 결과 데이터
 *      tags: [DebateTournament]
 *      security:
 *        - Authorization: []
 *      parameters:
 *        - in: path
 *          name: debateId
 *          required: true
 *          schema:
 *            type: integer
 *        - in: path
 *          name: round
 *          required: true
 *          schema:
 *            type: integer
 *        - in: path
 *          name: date
 *          required: true
 *          schema:
 *            type: string
 *            example: '2022-10-25'
 *        - in: query
 *          name: timeOffset
 *          required: true
 *          schema:
 *            tpye: integer
 *      responses:
 *        "200":
 *          description: success
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  matchId:
 *                    type: string
 *                  time:
 *                    type: string
 *                  judges:
 *                    type: array
 *                    items:
 *                      type: string
 *                  proTeam:
 *                    type: object
 *                    properties:
 *                      name:
 *                        type: string
 *                      score:
 *                        type: integer
 *                      judgeScoreFinal:
 *                        type: integer
 *                      judgeScores:
 *                        type: array
 *                        items:
 *                          type: integer
 *                      judgeScoresTotal:
 *                        type: array
 *                        items:
 *                          type: integer
 *                      voteScore:
 *                        type: integer
 *                  conTeam:
 *                    type: object
 *                    properties:
 *                      name:
 *                        type: string
 *                      score:
 *                        type: integer
 *                      judgeScoreFinal:
 *                        type: integer
 *                      judgeScores:
 *                        type: array
 *                        items:
 *                          type: integer
 *                      judgeScoresTotal:
 *                        type: array
 *                        items:
 *                          type: integer
 *                      voteScore:
 *                        type: integer
 *                      voteCount:
 *                        type: integer
 *        "400":
 *          description: error
 */
app.get('/result-data/:debateId/:round/:date', wrapAsync(async (req,res) => {
  const conn = require('../config/mysql/pool')().db()
  const {debateId, round, date} = req.params
  const {timeOffset} = req.query
  let response = []

  let sql = `
    SELECT matchid, DATE_FORMAT(TIMESTAMPADD(HOUR, ${timeOffset}, schedule), '%H:%i') AS time
    FROM debatetournament
    WHERE 
      debateid = ${debateId} AND 
      round = ${round} AND
      DATE_FORMAT(TIMESTAMPADD(HOUR, ${timeOffset}, schedule), '%Y-%m-%d') = '${date}'
    ORDER BY matchid
  `
  let result = await conn.query(sql)

  for (let r of result) {
    const obj = {
      matchId: r.matchid,
      time: r.time,
      judges: [],
      numTotalVotes: 0,
      proTeam: {
        name: '',
        score: 0,
        judgeScoreFinal: 0,
        judgeScores: [],
        judgeScoresTotal: [],
        voteScore: 0,
        voteCount: 0
      },
      conTeam: {
        name: '',
        score: 0,
        judgeScoreFinal: 0,
        judgeScores: [],
        judgeScoresTotal: [],
        voteScore: 0,
        voteCount: 0
      }
    }

    response.push(obj)
  }
  
  sql = `
    SELECT 
      id, agree, disagree, judgelist, matchid, 
      (SELECT freedom_to FROM debate WHERE id = ${debateId}) AS freedom_to
    FROM debatetournament
    WHERE 
      debateid = ${debateId} AND 
      round = ${round} AND
      DATE_FORMAT(TIMESTAMPADD(HOUR, ${timeOffset}, schedule), '%Y-%m-%d') = '${date}'
    ORDER BY matchid
  `
  result = await conn.query(sql)

  let isPersonal = true
  if (result[0].freedom_to > 0) isPersonal = false

  let idx = 0
  for (let r of result) {
    const judgeList = r.judgelist.split(',')

    for (let j of judgeList) {
      sql = `
        SELECT nickname
        FROM debatejudginguser 
        WHERE id = ${j}
      `
      let judgeName = await conn.query(sql)

      response[idx].judges.push(judgeName[0].nickname)
    }

    sql = `
      SELECT 
        ${isPersonal ? 'nickname' : 'name'} AS name
      FROM 
        ${isPersonal ? 'debateuser' : 'debateteam'}
      WHERE
        id = ${r.agree}
    `
    let agreeName = await conn.query(sql)

    response[idx].proTeam.name = agreeName[0].name

    sql = `
      SELECT 
        ${isPersonal ? 'nickname' : 'name'} AS name
      FROM 
        ${isPersonal ? 'debateuser' : 'debateteam'}
      WHERE
        id = ${r.disagree}
    `
    let disagreeName = await conn.query(sql)

    response[idx].conTeam.name = disagreeName[0].name

    sql = `
      SELECT 
        COUNT(id) AS vote_count,
        ROUND(
          COUNT(id) / 
          (COUNT(id) + (SELECT COUNT(id) FROM debatevote WHERE debatetournamentid = ${r.id} AND chooseid = ${r.disagree})) * 
          (SELECT score_to FROM debate WHERE id = ${debateId})
        , 1) AS vote_score
      FROM debatevote
      WHERE 
        debatetournamentid = ${r.id} AND
        chooseid = ${r.agree}
    `

    let agreeVoteScore = await conn.query(sql)

    response[idx].proTeam.voteScore = agreeVoteScore[0].vote_score == null ? 0 : agreeVoteScore[0].vote_score
    response[idx].proTeam.voteCount = agreeVoteScore[0].vote_count
    response[idx].numTotalVotes += agreeVoteScore[0].vote_count
    response[idx].proTeam.score += agreeVoteScore[0].vote_score

    sql = `
      SELECT 
        COUNT(id) AS vote_count,
        ROUND(
          COUNT(id) / 
          (COUNT(id) + (SELECT COUNT(id) FROM debatevote WHERE debatetournamentid = ${r.id} AND chooseid = ${r.agree})) * 
          (SELECT score_to FROM debate WHERE id = ${debateId})
        , 1) AS vote_score
      FROM debatevote
      WHERE 
        debatetournamentid = ${r.id} AND
        chooseid = ${r.disagree}
    `
    let disagreeVoteScore = await conn.query(sql)

    response[idx].conTeam.voteScore = disagreeVoteScore[0].vote_score == null ? 0 : disagreeVoteScore[0].vote_score
    response[idx].conTeam.voteCount = disagreeVoteScore[0].vote_count
    response[idx].numTotalVotes += disagreeVoteScore[0].vote_count
    response[idx].conTeam.score += disagreeVoteScore[0].vote_score
  
    sql = `
      SELECT 
        id, percent,
        (SELECT score_to FROM debate WHERE id = ${debateId}) AS score_to
      FROM debatejudging
      WHERE debateid = ${debateId}
      ORDER BY aream
    `
    let subResult = await conn.query(sql)

    for (let q of subResult) {
      const proJudgeScores = []
      const conJudgeScores = []

      let proJudgeTotal = 0
      let conJudgeTotal = 0

      let jIdx = 0
      for (let j of judgeList) {
        sql = `
          SELECT answer
          FROM debatejudginganswer
          WHERE 
            debateid = ${debateId} AND
            debatetournamentmatch = '${r.matchid}' AND
            debatejudgingid = ${q.id} AND
            debatejudginguserid = ${j} AND
            debateuserid = ${r.agree}
        `
        let answer = await conn.query(sql)

        if (answer.length != 0) {
          proJudgeScores.push(answer[0].answer)
          proJudgeTotal += answer[0].answer
          
          if (jIdx == judgeList.length - 1) {
            response[idx].proTeam.judgeScoresTotal.push(proJudgeTotal / judgeList.length / 5 * q.percent)
            response[idx].proTeam.judgeScoreFinal += (proJudgeTotal / judgeList.length / 5 * q.percent) * (q.score_to / 100)
            response[idx].proTeam.score += (proJudgeTotal / judgeList.length / 5 * q.percent) * (q.score_to / 100)
          }
        }

        sql = `
          SELECT answer
          FROM debatejudginganswer
          WHERE 
            debateid = ${debateId} AND
            debatetournamentmatch = '${r.matchid}' AND
            debatejudgingid = ${q.id} AND
            debatejudginguserid = ${j} AND
            debateuserid = ${r.disagree}
        `

        answer = await conn.query(sql)

        if (answer.length != 0) {
          conJudgeScores.push(answer[0].answer)
          conJudgeTotal += answer[0].answer

          if (jIdx == judgeList.length - 1) {
            response[idx].conTeam.judgeScoresTotal.push(conJudgeTotal / judgeList.length / 5 * q.percent)
            response[idx].conTeam.judgeScoreFinal += (conJudgeTotal / judgeList.length / 5 * q.percent) * (q.score_to / 100)
            response[idx].conTeam.score += (conJudgeTotal / judgeList.length / 5 * q.percent) * (q.score_to / 100)
          }
        }
        jIdx++
      }

      response[idx].proTeam.judgeScores.push(proJudgeScores)
      response[idx].conTeam.judgeScores.push(conJudgeScores)
    }
    idx++
  }
  res.json(response)
}))

app.use((err, req, res, next) => {
  console.log(err)
  logger.error(err)
  res.status(500).json({err: err.toString()})
})

module.exports = app