var ackP = require('../ack-p'),
  assert = require('assert')

var isCyclic = require('./isCyclic')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  it('basic',function(done){
    p.next(function(next){
      assert.equal(this.values.length,0,'1st next failed. Expected no saved args. Got '+this.values.length)
      next(0)
    })
    .next(function(a, next){
      assert.equal(a,0,'2nd next failed. Got '+typeof(a))
      next(1)
    })
    .next(function(a, next){
      assert.equal(a,1,'3rd next failed')
      next()
    })
    .then(function(){
      if(arguments.length!=0){
        throw new Error('expected no arguments. got '+arguments.length);
      }

      assert.equal(isCyclic(p),false)
    })
    .then(done).catch(done)
  })

  it('catches',function(done){
    var pp = p.next(function(next){
      assert.equal(this.values.length,0,'1st next failed. Expected no saved args. Got '+this.values.length)
      next(0)
    })
    .next(function(a, next){
      assert.equal(a,0,'2nd next failed. Got '+typeof(a))
      next(1)
    })
    .next(function(a, next){
      var t = function(){
        var e = new Error('meaning to error')
        e.test = 676
        throw e;
      }
      t()
    })
    .then(function(){
      throw new Error('should not get here');
    })

    var ppp = pp.catch('meaning to error',function(e){
      done()
    })
    ppp.catch(done)
  })

  it('over-promise',function(done){
    p.next(function(next){
      assert.equal(this.values.length,0,'1st next failed. Expected no saved args. Got '+this.values.length)
      next(0)
      setTimeout(next, 10)//this should be ignored
    })
    .next(function(a, next){
      assert.equal(a,0,'2nd next failed. Got '+typeof(a))
      next()
    })
    .then(done).catch(done)
  })

  it('works',function(done){
    p.set(1,2,3)
    .then(function(a,b,c){
      if(a!=1 || b!=2 || c!=3)throw 'expected a=1, b=2, c=3';
      return 123
    })
    .then(function(result){
      return 321
    })
    .next(function(result,a,b,next){
      if(result!=321)throw 'Expected 321. Got'+result;
      setTimeout(function(){
        next(1,2,3)
      }, 10)
    })
    .then(function(a,b,c){
      if(a!=1 || b!=2 || c!=3)throw new Error('expected a=1, b=2, c=3');
    })
    .then(done).catch(done)
  })

  describe('#catch', require('./test-next-catch'))

  it('#context',function(done){
    p.myvar = 77

    p.next(function(next){
      assert.equal(this.test,33)
      assert.equal(p.myvar,77)
      next(0,1)
    },{test:33})
    .bind({myvar:77})
    .next(function(a,b,next){
      assert.equal(a,0)
      assert.equal(b,1)
      assert.equal(this.myvar,77)
      next(1)
    })
    .bind({myvar:88})
    .next(function(a,next){
      assert.equal(this.myvar,88)
      assert.equal(a,1)
      next(2)
    })
    .next(function(next){
      assert.equal(this.test,1)
      assert.equal(typeof(next),'function')
      next(22,44)
    },{test:1})
    .then(function(a,b){
        assert.equal(a,22)
        assert.equal(b,44)
    })
    .then(done).catch(done)
  })

}