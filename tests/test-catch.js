var ackP = require('../ack-p'),
  assert = require('assert'),
  bluebird = require('bluebird')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  it('code',function(done){
    p.then(function(){
      var e = new Error('x')
      e.code = 404
      throw e
    })
    .catch(404,function(e){
      assert.equal(e.code, 404)
    })
    .then(done).catch(done)
  })

  it('basic',function(done){
    p.set(1,2,3)
    .then(function(a,b,c){
      assert.equal(a, 1)
      assert.equal(b, 2)
      assert.equal(c, 3)
      return 123
    })
    .then(function(result){
      return 321
    })
    .next(function(result,a,b,next){
      if(result!=321)throw new Error('Expected 321. Got'+result);
      if(this.a!=1)throw new Error('expected this.a==1');
      setTimeout(function(){
        next.throw('blown out')
      }, 10)
    },{a:1})
    .then(function(a,b,c){
      if(a!=1 || b!=2 || c!=3)throw new Error('expected a=1, b=2, c=3');
    })
    .catch(function(e){
      var passes = !e || !e.message || e.message!='blown out'
      if(passes){
        throw new Error('expected error of "blown out"');
      }
      done()
    })
  })

  it('compound',function(done){
    p.then(function(){
      return 22
    })
    .then(function(){
      throw new Error(33)
    })
    .catch('22',function(){
      throw new Error('should not get here')
      return 32
    })
    .catch(function(){
      return 64
    })
    .then(function(r){
      assert.equal(r, 64)
    })
    .then(done).catch(done)
  })
/*
  //when an error occurs with-in a catch
  it('compound-with-error',function(done){
    p.then(function(){
      return 22
    })
    .then(function(){
      throw new Error(33)
    })
    .catch('33',function(){
      throw new Error('expected-to-error')
    })
    .catch('expected-to-error',function(){
console.log('56',22)
      return 64
    })
    .then(function(r){
      assert.equal(r, 64)
    })
    .then(done).catch(done)
  })
*/

  it('catch-continue',function(done){
    p.then(function(){
      return 22
    })
    .then(function(){
      throw new Error(33)
    })
    .catch(function(){
      return 64
    })
    .then(function(r){
      assert.equal(r, 64)
    })
    .then(done).catch(done)
  })

  it('catch-sub-promise-continue',function(done){
    p.then(function(){
      return 22
    })
    .then(function(){
      return ackP.start().then(function(){
        throw new Error(33)
      })
      .catch('34',function(e){
        done(new Error('not supposed to get into this error'))
      })
    })
    .catch(function(){
      return 64
    })
    .then(function(r){
      assert.equal(r, 64)
    })
    .then(done).catch(done)
  })

  it('catch-bluebird-sub-promise-continue',function(done){
    var bbPromise = []

    p.then(function(){
      return 22
    })
    .then(function(){
      var temp = bluebird.promisify(function(callback){
        setTimeout(function(){
          callback(new Error(33))
        }, 100)
      })

      temp = temp()
      bbPromise.push( temp )
      return temp
    })
    .catch('33',function(e){
      return 64
    })
    .then(function(r){
      assert.equal(r, 64)
    })
    .then(done).catch(done)
  })

  it('throw-in-catch', function(done){
    p.then(function(){
      throw 44
    })
    .catch(function(e){
      assert.equal(e, 44)
      throw 55
    })
    .then(function(){
      throw 'we should never get here'
    })
    .catch(function(e){
      assert.equal(e, 55)
    })
    .then(done).catch(done)
  })
}