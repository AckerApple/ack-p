var ackP = require('../ack-p'),
  assert = require('assert')

var isCyclic = require('./isCyclic')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  it('simple',function(done){
    p
    .then(function(){
      assert.equal(this.values.length,0,'1st next failed. Expected no saved args. Got '+this.values.length)
    })
    .next(function(next){
      assert.equal(this.values.length,0,'1st next failed. Expected no saved args. Got '+this.values.length)
      setTimeout(function(){
        next(0)
      }, 20)
    })
    .bind({x:444})
    .next(function(a,next){
      assert.equal(a,0,'2nd next failed. Got '+typeof(a))
      assert.equal(this.x,444)
      next(1)
    })
    .bind({x:555})
    .next(function(a, next){
      assert.equal(a,1,'3rd next failed')
      assert.equal(this.x,555)
      assert.equal(isCyclic(this),false)
      next()
    })
    .then(done).catch(done)
  })

  it('start-with-bind',function(done){
    p.bind({myvar:77})
    .then(function(){
      assert.equal(this.myvar,77)
      return 0
    })
    .then(function(a){
      assert.equal(a,0)
      assert.equal(this.myvar,77)
      return 1
    })
    .bind({myvar:88})
    .then(function(a){
      assert.equal(this.myvar,88)
      assert.equal(a,1)
      assert.equal(typeof(this),'object')
      return 22
    })
    .then(function(a){
        assert.equal(a,22)
    })
    .then(done).catch(done)
  })

  it('context',function(done){
    p.set(1,2,3).bind({self:44})
    .then(function(a,b,c){
      if(a!=1 || b!=2 || c!=3)throw 'set did not work';
      return 123
    })
    .then(function(result){
      if(result!=123)throw new Error('Expected 123. Got '+result);
      if(this.self!=44)throw 'Expected 44. Got type: '+typeof(this.self);
      return 321
    })
    .then(function(result){
      if(result!=321)throw new Error('Expected 321. Got '+result);
      if(this.self!=66)throw new Error('Expected 66');
    },{self:66})
    .then(done).catch(done)
  })

  it('bind-promise',function(done){
    var promise = ackP.start()
    .set({self:44})

    p.set(1,2,3).bind(promise)
    .then(function(a,b,c){
      assert.equal(a, 1)
      assert.equal(b, 2)
      assert.equal(c, 3)
      return 123
    })
    .then(function(result){
      assert.equal(result, 123)
      assert.equal(this.self, 44)
      return 321
    })
    .then(function(result){
      assert.equal(result, 321)
      assert.equal(this.self, 66)
    },{self:66})
    .then(done).catch(done)
  })
}