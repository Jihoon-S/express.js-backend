module.exports.toTimeStamp = (date) => {
  const timeStamp = new Date(date)
  return timeStamp.toISOString().replace('T', ' ').substring(0, 19)
}

module.exports.isSquareNum = (num) => {
  const binNum = (num).toString(2)
  const isValid = ((binNum.match(/1/g) || []).length === 1) && (binNum.length > 1)
  return isValid
}

module.exports.getExponent = (num, int) => {
  let exponent = 0

  while (true) {
    const devided = num / int
    num = devided
    exponent+=1
    if (devided < int) break 
  }

  return exponent
}
 
module.exports.groupBy = (data, predicate) => {
  return data.reduce((result, value) => {
    let group = value[predicate]

    if (typeof predicate === 'function') {
      group = predicate(value)
    }

    if (result[group] === undefined) {
      result[group] = []
    }

    result[group].push(value);
    return result
  }, {})
}

module.exports.getFullMonth = (num) => {
  const month = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
  return month[num]
}

module.exports.getFullDate = (num) => {
  if (num < 10) {
    num = 0 + String(num)
  }
  return num
}