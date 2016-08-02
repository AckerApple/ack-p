module.exports = function(obj) {
  var seenObjects = [];

  function detect (obj) {
    if (obj && typeof obj === 'object') {
      if (seenObjects.indexOf(obj) !== -1) {
        return true;
      }
      seenObjects.push(obj);
      for(var key in obj) {
        if(obj.hasOwnProperty(key) && detect(obj[key])){
          console.log('!!!!cyclic reference detected!!!'+ key)
          console.log(obj.stack);
          return true;
        }
      }
    }
    return false;
  }

  return detect(obj);
}