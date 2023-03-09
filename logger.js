const winston = require('winston')
const winstonDaily = require('winston-daily-rotate-file')

const logDir = './expressback/logs'

const { combine, timestamp, printf, colorize, simple } = winston.format

const logFormat = printf((info) => { // 로그 출력 형식
  return `${info.timestamp} ${info.level}: ${info.message}`
});

/*
 * Log Level
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */
const logger = winston.createLogger({
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    logFormat,
  ),
  transports: [
    new winstonDaily({ // 로그파일 일자별 저장
      level: 'info',
      datePattern: 'YYYY-MM-DD', // 파일 이름에 넣을 날짜 형식 정의
      dirname: logDir, // 로그 파일을 저장할 디렉토리
      filename: `%DATE%.log`, // 파일 이름
      maxFiles: 30, // 30일 단위
      zippedArchive: true, 
    }),

    new winstonDaily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir + '/error',
      filename: `%DATE%.error.log`,
      maxFiles: 30,
      zippedArchive: true,
    }),
  ],

  exceptionHandlers: [ // 예외 발생 시, 로그 레벨로 처리
    new winstonDaily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir + '/error',
      filename: `%DATE%.exception.log`,
      maxFiles: 30,
      zippedArchive: true,
    }),
  ],
});

logger.stream = { // 외부에서 로거 파일을 불러올 때 실행할 스트림
  write: (message) => {
    logger.info(message)
  },
};

// 배포 환경이 아닐 때는 로그를 간단히 나타내서 파일의 크기를 줄임
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(
//     new winston.transports.Console({
//       format: combine(colorize(), simple()),
//     }),
//   );
// }

module.exports = logger