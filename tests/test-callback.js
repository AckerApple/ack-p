var ackP = require('../ack-p'),
  assert = require('assert')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  it('works',function(done){
    var callback = function(a,b,next){
      setTimeout(function(){
        next(null,33,44)
      }, 15)
    }

    p.callback(callback)
    .then(function(r,f){
      if(r!=33)throw new Error('expected callback to return 33')
      if(f!=44)throw new Error('expected callback to return 44')
    })
    .then(done).catch(done)
  })

  it('catches',function(done){
    var callbackError = function(a,b,next){
      setTimeout(function(){
        var e = new Error('expected error to be thrown')
        e.name='callback-error'
        next(e)
      }, 10)
    }

    p.callback(callbackError)
    .catch('callback-error',function(e){
      done()
    })
    .catch(done)
  })

  it('catches-sub-promise',function(done){
    p
    .callback(function(callback){
      setTimeout(function(){
        callback(null, 99)
      }, 20)
    })
    .then(function(r){
      assert.equal(r,99)
      return ackP.start()
      .callback(function(callback){
        setTimeout(function(){
          var e = new Error('expected error to be thrown')
          e.name='callback-error'
          callback(e)
        }, 10)
      })
    })
    .catch('callback-error',function(e){
      done()
    })
    .catch(done)
  })

  it('then-promises-fail',function(done){
    p
    .set(23,24)
    .callback(function(a,b,callback){
      assert.equal(a, 23)
      assert.equal(b, 24)
      callback('88')
    })
    .then(function(){
      return 'regular-then'
    })
    .set(44)
    .then(function(){
      return ackP.start()
      .then(function(){
        return 33
      })
      .callback(function(x,callback){
        assert.equal(x, 33)
        callback('88')//causes error
      })
    })
    .then(function(r){
      throw 'i should not be called';
    })
    .catch('88',function(){
      done()
    })
    .catch(done)
  })

  it('binds',function(done){
    p.bind({t:22, u:44})
    .callback(function(callback){
      assert.equal(this.t,22)
      assert.equal(this.u,44)
      callback()
    })
    .callback(function(callback){
      assert.equal(this.t,22)
      assert.equal(this.u,44)
      callback()
    })
    .then(done).catch(done)
  })

  it('self-binds',function(done){
    var callback = function(a,b,next){
      setTimeout(function(){
        next(null,33,44)
      }, 15)
      assert.equal(this.fork, 33)
    }

    p.callback(callback,{fork:33})
    .then(function(r,f){
      if(r!=33)throw new Error('expected callback to return 33')
      if(f!=44)throw new Error('expected callback to return 44')
    })
    .then(done).catch(done)
  })
}