var ackP = require('../ack-p'),
  assert = require('assert')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  it('basic',function(done){
    p.set(1,2,3)
    .then(function(a,b,c){
      if(a!=1 || b!=2 || c!=3)throw new Error('expected a=1, b=2, c=3');
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

  it('catch-continue',function(done){
    var p0 = p.bind({test:96}).then(function(){
      assert.equal(this.test, 96)
      return 22
    })
    .then(function(){
      assert.equal(this.test, 96)
      throw new Error(33)
    })

    var p1 = p0.catch(function(){
      assert.equal(this.test, 96)
      return 64
    })

    var p2 = p1.then(function(r){
      assert.equal(this.test, 96)
      assert.equal(r, 64)
      var newErr = new Error(34)
      newErr.test = 34
      throw newErr
    })
    .catch(function(){
      assert.equal(this.test, 96)
      return false
    })
    .then(function(r){
      assert.equal(this.test, 96)
      assert.equal(r, false)
    })
    .then(function(){
      assert.equal(this.test, 96)
      done()
    })
    .catch(done)
  })
}