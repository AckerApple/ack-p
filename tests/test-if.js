var ackP = require('../ack-p'),
  assert = require('assert')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  it('simple',function(done){
    p.set(33,55)
    .if(44,function(){
      throw new Error('wrong if called')
    })
    .if(33,function(r,f){
      if(r!=33)throw new Error('expected r 33')
      if(f!=55)throw new Error('expected f 55')
      return 66
    })
    .then(function(r){
      if(r!=66)throw new Error('expected r 66. Got '+r)
    })
    .then(done).catch(done)
  })

  it('precise',function(done){
    p.set(1)
    .if(true,function(r,f){
      throw new Error('i should have not run')
    })
    .if(1,function(r){
      return 22
    })
    .then(function(r){
      assert.equal(r, 22)
    })
    .then(done).catch(done)
  })

  it('#ifNot',function(done){
    p.set(33,55)
    .ifNot(33,function(r){
      throw new Error('wrong if called')
    })
    .ifNot(22,function(r,f){
      assert.equal(r, 33)
      assert.equal(f, 55)
      return 66
    })
    .then(function(r){
      assert.equal(r, 66)
    })
    .then(done).catch(done)
  })

  it('function-condition',function(done){
    p.set(44,66)
    .if(55,function(){
      throw new Error('wrong if called')
    })
    .if(function(r,f){
      return r==44 && f==66
    },function(r,f){
      if(r!=44)throw new Error('expected r 44')
      if(f!=66)throw new Error('expected f 66')
      return 88
    })
    .then(function(r){
      if(r!=88)throw new Error('expected r 88. Got '+r)
    })
    .then(done).catch(done)
  })

  it('ifNext',function(done){
    p.set(33,55)
    .if(44,function(){
      throw new Error('wrong if called')
    })
    .if(33,function(r,f){
      if(r!=33)throw new Error('expected r 33')
      if(f!=55)throw new Error('expected f 55')
      return 66
    })
    .then(function(r){
      if(r!=66)throw new Error('0.0 expected 66. Got '+r)
      return ackP.start().set(r).next(function(r,next){
        setTimeout(function(){
          next(r)
        }, 10)
      })
    })
    .if(false,function(){
      throw new Error('should have never called this function')
    })
    .ifNext(66,function(r,next){
      if(r!=66)throw new Error('0.1 expected 66. Got '+r)
      setTimeout(function(){
        next(77)
      }, 10)
    })
    .then(function(r){
      if(r!=77)throw new Error('0.2 expected 66. Got '+r)
      return 88
    })
    .ifNext(88,function(next){
      next()
    })
    .then(done).catch(done)
  })

  it('sub-promises',function(done){
    var counter = 0
    p
    .then(function(){
      return ackP.start().callback(function(callback){
        setTimeout(function(){
          ++counter
          callback(null, true)
        }, 10)
      })
    })
    .if(true, function(){
      ++counter
      return true
    })
    .if(true, function(){
      ++counter
      return true
    })
    .if(false,function(){
      ++counter
    })
    .bind({a:1,b:2})
    .then(function(){
      assert.equal(counter, 3)
      assert.equal(this.a, 1)
      assert.equal(this.b, 2)
    })
    .then(function(){
      return ackP.start().callback(function(callback){
        setTimeout(function(){
          ++counter
          callback(null, true)
        }, 10)
      })
    })
    .if(false,function(){
      ++counter
    })
    .if(true, function(){
      ++counter
      return true
    })
    .if(true, function(){
      ++counter
      return true
    })
    .then(function(){
      assert.equal(counter, 6)
    })
    .then(done).catch(done)
  })

  it('sub-has-if-promise',function(done){
    var counter = 0
    p
    .then(function(){
      return ackP.start().callback(function(callback){
        setTimeout(function(){
          ++counter
          callback(null, true, 33)
        }, 10)
      })
    })
    .if(true, function(result, tt){
      assert.equal(tt, 33)
      ++counter
      return true
    })
    .if(true, function(){
      ++counter
      return true
    })
    .if(false,function(){
      ++counter
    })
    .bind({a:1,b:2})
    .then(function(){
      assert.equal(counter, 3)
      return true
    })
    .if(true, function(){
      return ackP.start().callback(function(callback){
        setTimeout(function(){
          ++counter
          callback(null, true, 33)
        }, 10)
      })
    })
    .if(false,function(){
      ++counter
    })
    .if(true, function(result, tt){
      assert.equal(tt, 33)
      ++counter
      return true
    })
    .if(true, function(){
      ++counter
      return true
    })
    .then(function(){
      assert.equal(counter, 6)
    })
    .then(done).catch(done)
  })

  describe('ifCallback',function(){
    it('works',function(done){
      p.set(33,55)
      .if(44,function(){
        throw new Error('wrong if called')
      })
      .if(33,function(r,f){
        if(r!=33)throw new Error('expected r 33')
        if(f!=55)throw new Error('expected f 55')
        return 66
      })
      .then(function(r){
        if(r!=66)throw new Error('expected r 66. Got '+r)
        return r
      })
      .ifCallback(66,function(next){
        setTimeout(function(){
          next(null,66)
        }, 10)
      })
      .ifCallback(66,function(r,next){
        if(r!=66)throw new Error('expected r 66. Got '+r)
        setTimeout(function(){
          next(null,77)
        }, 10)
      })
      .then(function(r){
        if(r!=77)throw new Error('Expected 77')
      })
      .then(done).catch(done)
    })

    it('catches',function(done){
      p.set(33,55)
      .if(44,function(){
        throw new Error('wrong if called')
      })
      .if(33,function(r,f){
        if(r!=33)throw new Error('expected r 33')
        if(f!=55)throw new Error('expected f 55')
        return 66
      })
      .then(function(r){
        if(r!=66)throw new Error('expected r 66. Got '+r)
        return r
      })
      .ifCallback(66,function(r,next){
        if(r!=66)throw new Error('expected r 66. Got '+r)
        setTimeout(function(){
          var e = new Error('expected error')
          e.name='expected-error'
          next(e,77)
        }, 20)
      })
      .catch('expected-error',function(e){
        done()
      }).catch(done)
    })
  })
}