var ackP = require('../ack-p'),
  assert = require('assert')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  it('simple',function(done){
    p.bind({myvar:77})
    .then(function(){
      assert.equal(this.myvar,77)
      return [0,1]
    })
    .spread(function(a,b){
      assert.equal(a,0)
      assert.equal(b,1)
      assert.equal(this.myvar,77)
      return 1
    })
    .bind({myvar:88})
    .next(function(a,next){
      assert.equal(this.myvar,88)
      assert.equal(a,1)
      next([0,1])
    })
    .spread(function(a,b){
      assert.equal(a,0)
      assert.equal(b,1)
      assert.equal(typeof(this),'object')
      //assert.equal(typeof(this.then),'function')
      return [22,44]
    })
    .spread(function(a,b){
        assert.equal(a,22)
        assert.equal(b,44)
    })
    .then(done).catch(done)
  })

  it('empty',function(done){
    p.then(function(){
      return [1,2,3]
    })
    .spread()
    .then(function(a,b,c){
      assert.equal(a,1)
      assert.equal(b,2)
      assert.equal(c,3)
    })
    .then(done).catch(done)
  })

  it('#spreadCallback',function(done){
    p.bind({myvar:77})
    .then(function(){
      assert.equal(this.myvar,77)
      return [0,1]
    })
    .spreadCallback(function(a,b,callback){
      assert.equal(a,0)
      assert.equal(b,1)
      assert.equal(this.myvar,77)
      setTimeout(function(){
        callback(null,1)
      }, 10)
    })
    .bind({myvar:88})
    .next(function(a,next){
      assert.equal(this.myvar,88)
      assert.equal(a,1)
      next([0,1])
    })
    .spread(function(a,b){
      assert.equal(a,0)
      assert.equal(b,1)
      assert.equal(typeof(this),'object')
      //assert.equal(typeof(this.then),'function')
      return [22,44]
    })
    .spread(function(a,b){
        assert.equal(a,22)
        assert.equal(b,44)
    })
    .then(done).catch(done)
  })
}