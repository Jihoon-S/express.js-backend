const express = require('express');
const app = express();
const fs = require('fs');
const { parse } = require("csv-parse");

const KOREAN_ID = 0;
const ENGLISH_ID = 1;
const RUSSIAN_ID = 2;

const translations = {};

fs.createReadStream("./expressback/data/dc_translation_230125.csv")
    .pipe(parse({ delimiter: ",", from_line: 3 }))
    .on("data", (row) => {
        const vals = {};
        vals[KOREAN_ID] = { 
            value: row[KOREAN_ID + 1], 
            hasNewLine: row[KOREAN_ID + 1].indexOf('\\n') 
        };
        vals[ENGLISH_ID] = {
            value: row[ENGLISH_ID + 1], 
            hasNewLine: row[ENGLISH_ID + 1].indexOf('\\n')
        };
        vals[RUSSIAN_ID] = {
            value: row[RUSSIAN_ID + 1], 
            hasNewLine: row[RUSSIAN_ID + 1].indexOf('\\n')
        };
        translations[row[0]] = vals;
    })
    .on("end", () => {
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`Translation csv loaded & heap used approximately ${Math.round(used * 100) / 100} MB`);
    })
    .on("error", (error) => {
        console.log(error.message);
    }
);

module.exports.translations = translations;

app.get('/', (req, res) => {
    const { requested_codes, language_id } = req.query;

    const result = {};
    requested_codes.forEach((code) => {
        result[code] = translations[code][language_id];
    })

    return res.status(200).json({
        message : 'success',
        translations : result
    });
})

module.exports = app