var ackP = require('../ack-p'),
  assert = require('assert')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  var data,getPictures,getAlbums,getError

  beforeEach(function(){
    data = {pictures:[0,1,2,3], albums:[0,1,2]}
    getPictures = ackP.resolve().next(function(next){
      setTimeout(function(){
        next(data.pictures)
      }, 30)
    })
    getAlbums = ackP.resolve().then(function(){
      return data.albums
    })
    getError = ackP.start().then(function(){
      var e = new Error('planned join error')
      e.name = 'getError'
      throw(e)
    })
  })

  describe('All',function(){
    it('all',function(done){
      ackP.all([
        ackP.resolve(1),
        ackP.resolve(2),
        ackP.resolve(3),
        ackP.resolve(4)
      ])
      .then(function(r){
        assert.equal(r[0], 1)
        assert.equal(r[1], 2)
        assert.equal(r[2], 3)
        assert.equal(r[3], 4)
      })
      .then(done).catch(done)
    })
  })

  it('empty',function(done){
    p.all([]).then(done).catch(done)
  })

  it('promise-all-values',function(done){
    p.then(function(){
      return [1,2,3,4]
    })
    .all()
    .then(function(r){
      assert.equal(r[0], 1)
      assert.equal(r[1], 2)
      assert.equal(r[2], 3)
      assert.equal(r[3], 4)
    })
    .then(done).catch(done)
  })

  it('promise-all-promises',function(done){
    p.then(function(){
      return [
        ackP.resolve(1),
        ackP.resolve(2),
        ackP.resolve(3),
        ackP.resolve(4)
      ]
    })
    .all()
    .then(function(r){
      assert.equal(r[0], 1)
      assert.equal(r[1], 2)
      assert.equal(r[2], 3)
      assert.equal(r[3], 4)
    })
    .then(done).catch(done)
  })

  it('simple-all',function(done){
    p.all(getPictures, getAlbums)
    .spread(function(pictures, albums){
      assert.equal(data.pictures.length,pictures.length, 'expected '+data.pictures.length+' pictures')
      assert.equal(data.albums.length,albums.length,'expected '+data.albums.length+' albums');
      return [pictures,albums]
    })
    .then(function(dataArray){
      assert.equal(dataArray[0].length, data.pictures.length,'after join failed');
      assert.equal(dataArray[1].length, data.albums.length, 'after join failed');
    })
    .then(done).catch(done)
  })

  it('by-array',function(done){
    p.all([getPictures, getAlbums])
    .spread(function(pictures, albums){
      assert.equal(data.pictures.length,pictures.length, 'expected '+data.pictures.length+' pictures')
      assert.equal(data.albums.length,albums.length,'expected '+data.albums.length+' albums');
      return [pictures,albums]
    })
    .then(function(dataArray){
      assert.equal(dataArray[0].length, data.pictures.length,'after join failed');
      assert.equal(dataArray[1].length, data.albums.length, 'after join failed');
    })
    .then(done).catch(done)
  })

  it('all-error',function(done){
    p.all(getError)
    .then(function(pictures){
      throw new Error('i should have never been called');
    })
    .catch('geterror',function(e){
      if(e.name!='getError')throw 'recieved wrong error';
      done()
    })
    .catch(done)
  })
}