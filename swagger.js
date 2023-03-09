const express = require('express')
const app = express()
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "DebateClub Express API",
        version: "0.1.0",
        description:
          "This is DebateClub API application made with Express and documented with Swagger",
        license: {
          name: "MIT",
          url: "https://spdx.org/licenses/MIT.html",
        },
        contact: {
          name: "DebateClub",
          url: "",
          email: "",
        },
      },
      components: {
        securitySchemes: {
          Authorization: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              value: "Bearer <JWT token here>"
          }
        }
      },
      servers: [
        {
          // url: "https://duco.town/",
          url: "http://localhost:3000/",
        },
      ],
    },
    apis: [
      "./exon.js",
      "./expressback/banner.js",
      "./expressback/debate.js",
      "./expressback/debateJudging.js",
      "./expressback/debateJudgingAnswer.js",
      "./expressback/debateJudgingUser.js",
      "./expressback/debateList.js",
      "./expressback/debateStream.js",
      "./expressback/debateTeam.js",
      "./expressback/debateTournament.js",
      "./expressback/debateUser.js",
      "./expressback/debateVote.js",
      "./expressback/fileUpload.js",
      "./expressback/fileDelete.js",
      "./expressback/confirmation.js",
      "./expressback/user.js",
      "./expressback/email.js"
    ],
  };
  
  const specs = swaggerJsdoc(options);
  app.use("/v1",
    swaggerUi.serve,
    swaggerUi.setup(specs, { explorer: true })
  );

  module.exports = app