var ackP = require('../ack-p'),
  assert = require('assert')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  var data,getPictures,getAlbums,getError,controller

  beforeEach(function(){
    data = {pictures:[0,1,2,3], albums:[0,1,2]}
    getPictures = ackP.start().callback(function(callback){
      setTimeout(function(){
        callback(null, data.pictures)
      }, 10)
    })
    getAlbums = ackP.start().then(function(){
      return data.albums
    })

    controller = function(pictures, albums){
      assert.equal(data.pictures.length,pictures.length, 'expected '+data.pictures.length+' pictures')
      assert.equal(data.albums.length,albums.length,'expected '+data.albums.length+' albums');
      return [pictures,albums]
    }
  })

  it('controller-join',function(done){
    p.join(getPictures, getAlbums, controller)
    .then(function(dataArray){
      assert.equal(dataArray[0].length, data.pictures.length);
      assert.equal(dataArray[1].length, data.albums.length);
    })
    .then(done).catch(done)
  })

  it('no-controller',function(done){
    p.join(getPictures, getAlbums)
    .spread(controller)
    .spread(function(pictures, albums){
      assert.equal(pictures.length, data.pictures.length);
      assert.equal(albums.length, data.albums.length);
    })
    .then(done).catch(done)
  })

  it('by-array',function(done){
    p.join([getPictures, getAlbums], controller)
    .then(function(dataArray){
      assert.equal(dataArray[0].length, data.pictures.length)
      assert.equal(dataArray[1].length, data.albums.length);
    })
    .then(done).catch(done)
  })

  it('single-join',function(done){
    p.join(getPictures)
    .spread(function(pictures){
      assert.equal(data.pictures.length, pictures.length)
    })
    .set()
    .then(done).catch(done)
  })

  it('single-join-error',function(done){
    const getError = ackP.start().then(function(){
      var e = new Error('planned join error')
      e.name = 'getError'
      throw(e)
    })

    var pp = p.join(getError)
    .then(function(pictures){
      throw new Error('i should have never been called');
    })
    .catch('geterror',function(e){
      assert.equal(e.name, 'getError')
    })
    pp.catch(done).then(done)
  })
}