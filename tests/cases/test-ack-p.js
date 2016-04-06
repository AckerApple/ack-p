"use strict";

var ackP = require('../../ack-p'),
  bluebird = require('bluebird'),
  assert = require('assert')

//console.log('ackP',ackP)

//method used to ensure no memory back-and-forth references
var isCyclic = function(obj) {
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

function purpose_fail(message){
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.status = 401;
  this.code = "purpose_fail";
  this.message = message || "No authorization token was found";
}
purpose_fail.prototype = Object.create(Error.prototype);




describe('ackP',function(){
  this.timeout(200)

  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  afterEach(function(){
    assert.equal(isCyclic(p),false)
    /*
    //ensure data from promise has been released
    if(p.data!=null){
      console.log(p.data)
      if(p.data.nextTask && p.data.nextTask.method){
        console.log('-----Expected memory to have been cleared')
        console.log(p.data.nextTask.method.toString())
      }
      throw new Error('p.data != null typeof(p.data)=='+typeof(p.data))
    }
    */
  })

  it('#inspect',function(done){
    p.resolve(11,22,33)
    .inspect(function(promise, a, b, c){
        assert.equal(promise.values.constructor, Array)
        assert.equal(promise.values[0], 11)
        assert.equal(promise.values[1], 22)
        assert.equal(promise.values[2], 33)
        assert.equal(a, 11)
        assert.equal(b, 22)
        assert.equal(c, 33)
    })
    .then(function(a,b,c){
      assert.equal(a, 11)
      assert.equal(b, 22)
      assert.equal(c, 33)
    })
    .resolve()
    .then(done).catch(done)
  })

  it('#thenPromise',function(done){
    var prom2 = ackP.start().callback(function(callback){
      setTimeout(callback, 20)
    }).set(55)

    p.then(prom2).then(function(a){
      assert.equal(a,55)
    })
    .then(done).catch(done)
  })

  describe('#catch',function(){
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
  })

  //ensure no cyclic references
  it('isCyclic',function(){
    var t = new ackP(function(res,rej){
      res()
    })
    assert.equal(isCyclic(t),false)
    assert.equal(isCyclic(p),false)
    assert.equal(p.inpass==null,true)
  })

  it('constructor',function(done){
    new ackP(function(resolve,reject){
      setTimeout(function(){//arbitrary async timeout
        resolve('a','b','c')
      }, 10)
    })
    .then(function(a,b,c){
      assert(a,'a')
      assert(b,'b')
      assert(c,'c')
    })
    .then(done).catch(done)
  })

  describe('Other-Libraries',function(){
    if(Promise){
      describe('ECMA6 Promise',function(){
        it('continues-from',function(done){
          p.then(function(){
            return new Promise(function(resolve, reject){
              resolve(33)
            })
          })
          .then(function(r){
            assert.equal(r,33)
          })
          .then(done).catch(done)
        })

        it('continues',function(done){
          new Promise(function(resolve, reject){
            resolve(33)
          })
          .then(function(r){
            assert.equal(r,33)
            return p.then(function(){
              return 55
            })
          })
          .then(function(r){
            assert.equal(r, 55)
          })
          .then(done).catch(done)
        })

        it('continues-with-callback',function(done){
          new Promise(function(resolve, reject){
            resolve(33)
          })
          .then(function(r){
            assert.equal(r,33)
            var pp = p.callback(function(callback){
              setTimeout(function(){
                callback(null, 55)
              }, 20)
            })
            .then(function(r){
              assert.equal(r, 55)
              return 66
            })
            .catch(function(e){
              console.log(10101010,e)
            })
            return pp
          })
          .then(function(r){
            assert.equal(r, 66)
          })
          .then(done).catch(done)
        })

        it('continues-with-error',function(done){
          var p6 = new Promise(function(resolve, reject){
            resolve(33)
          })
          .then(function(r){
            assert.equal(r,33)
            var pp = p.then(function(callback){
              throw new Error('ecma0 should not get in here');
            })
            .then(function(r){
              done(new Error('should not get in here'));
            })

            return pp
          })
          .then(function(r){
            throw new Error('ecma1 should not get in here');//purpose_fail error should have skipped this section
          })
          .catch(function(e){
            done()
          })
        })
      })
    }


    describe('bluebirds',function(){
      it('continues-from',function(done){
        p.then(function(){
          return new bluebird(function(resolve, reject){
            resolve(33)
          })
        }).then(function(r){
          assert.equal(r,33)
        })
        .then(done).catch(done)
      })

      it('continues',function(done){
        new bluebird(function(resolve, reject){
          resolve(33)
        }).then(function(r){
          assert.equal(r,33)
          return p.then(function(){
            return 55
          })
        }).then(function(r){
          assert.equal(r, 55)
        })
        .then(done).catch(done)
      })

      it('continues-with-callback',function(done){
        new bluebird(function(resolve, reject){
          resolve(33)
        })
        .then(function(r){
          assert.equal(r,33)
          var pp = p.callback(function(callback){
            setTimeout(function(){
              callback(null, 55)
            }, 20)
          })
          .then(function(r){
            assert.equal(r, 55)
            return 66
          })
          .catch(function(e){
            console.log(10101010,e)
          })
          return pp
        })
        .then(function(r){
          assert.equal(r, 66)
        })
        .then(done).catch(done)
      })

      it('continues-with-callback-error',function(done){
        new bluebird(function(resolve, reject){
          resolve(33)
        })
        .then(function(r){
          assert.equal(r,33)
          var pp = p.callback(function(callback){
            setTimeout(function(){
              callback(new purpose_fail('purpose_fail'), 55)
            }, 20)
          })
          .then(function(r){
            done(new Error('should not get in here'));
          })
          return pp
        })
        .then(function(r){
          throw new Error('should not get in here');//purpose_fail error should have skipped this section
        })
        .catch(purpose_fail,function(){
          done()
        })
        .catch(function(e){
          done(new Error('never supposed to get in here. Error already should have been caught'))
        })
      })
    })
  })

  describe('#call',function(done){
    it('#set',function(done){
      p.set({toString:function(){return 'spice'}})
      .call('toString')
      .then(function(result){
        if(result!='spice')new Error('expected spice')
      })
      .then(done).catch(done)
    })

    it('#then',function(done){
      p.then(function(){
        return {ace:function(r){
          return r
        }}
      })
      .call('ace',22)
      .then(function(result){
        assert.equal(result, 22)
      })
      .then(done).catch(done)
    })
  })

  describe('#method',function(){
    it('starts',function(done){
      var m = ackP.method(function(one, two, three){
        assert.equal(one, 1)
        assert.equal(two, 2)
        assert.equal(three, 3)
      })

      m(1,2,3).then(done).catch(done)
    })

    it('start-catches',function(done){
      var m = ackP.method(function(one, two, three){
        throw new Error('method-error-test');
      })

      m(3,2,1).catch('method-error-test',function(){done()})
    })

    it('runs',function(done){
      ackP.start().then(function(){
        return 33
      })
      .method(function(thirtyThree){
        assert.equal(thirtyThree, 33)
      })
      .then(done).catch(done)
    })
  })

  describe('#bind',function(){
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
      var promise = ackP.start().set({self:44})
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
  })

  it('#bindResult',function(done){
    p.set(34).then(function(){
      return {my:'hello', name:'world'}
    })
    .bindResult()
    .then(function(result){
      assert.equal(result.my, 'hello')
      assert.equal(result.name, 'world')
      assert.equal(this.my, 'hello')
      assert.equal(this.name, 'world')
    })
    .then(done).catch(done)
  })

  it('#bindCall',function(done){
    p.set(34).then(function(){
      return {
        my:'hello', name:'world'
        ,test0:function(r){return r}, test1:function(){return 'hello world'}
      }
    })
    .bindResult()
    .bindCall('test0')
    .bindCall('test1')
    .then(function(result){
      assert.equal(result, 'hello world')
      assert.equal(this.my, 'hello')
      assert.equal(this.name, 'world')
    })
    .then(done).catch(done)
  })

  describe('#next',function(){
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

    describe('#catch',function(){
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
    })

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

  })

  it('#set',function(done){
    p.set(1,2,3)
    .then(function(a,b,c){
      if(a!=1 || b!=2 || c!=3)throw new Error('set did not work correctly');
    })
    .set([2.3,4])
    .then(function(a){
      assert(a.constructor,Array)
      assert(a.length,3)
    })
    .set([2,3,4])
    .spread(function(a,b,c){
      assert.equal(a,2)
      assert.equal(b,3)
      assert.equal(c,4)
      assert.equal(isCyclic(p),false)
    })
    .then(done).catch(done)
  })

  describe('#get',function(){
    it('object',function(done){
      p.set({a:1,b:2,c:3})
      .get('c')
      .then(function(c){
        assert(c,3)
      })
      .then(done).catch(done)
    })

    it('array',function(done){
      p.set(['a','b','c'])
      .get(2)
      .then(function(c){
        assert(c,3)
      })
      .then(done).catch(done)
    })

    it('negative-array',function(done){
      p.set(['a','b','c'])
      .get(-1)
      .then(function(c){
        assert(c,3)
      })
      .then(done).catch(done)
    })

    it('sub-object',function(done){
      p.set({a:1,b:2,c:{sub:3}})
      .get('c','sub')
      .then(function(c){
        assert(c,3)
      })
      .then(done).catch(done)
    })
  })

  describe('#delay',function(){
    it('then-delay',function(done){
      p.then(function(){
        return 7869
      })
      .delay(20)
      .then(function(r){
        if(r!=7869)throw new Error('expected 7869')
      })
      .then(done).catch(done)
    })

    it('delay',function(done){
      var xx=0
      setTimeout(function(){
        xx=22
      }, 20)

      p.delay(30)
      .then(function(r){
        assert.equal(xx, 22)
      })
      .then(done).catch(done)
    })
  })

  describe('#spread',function(){
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
  })

  it('#past',function(done){
    p.then(function(){
      return 22
    })
    .past(function(r){
      if(r!=22)throw '0.0 expected 22';
      return 77
    })
    .past(function(r){
      if(r!=22)throw '0.1 expected 22. Got '+r;
      return 88
    })
    .then(function(r){
      if(r!=22)throw '0.2 expected 22';
      return 99
    })
    .then(function(r){
      if(r!=99)throw '0.3 expected 99';
    })
    .then(done).catch(done)
  })

  describe('#pass',function(){
    this.timeout(2000)

    it('sync',function(done){
      var tester = 0

      p.then(function(){
        return 4224
      })
      .pass(function(r,next){
        assert.equal(r,4224,'first pass expected 4224')
        ++tester
        next(3773)
      })
      .pass(function(r,next){
        assert.equal(r,4224,'second pass expected 4224 - '+r)
        ++tester
        next(299)
      })
      .then(function(r){
        assert.equal(r,4224,'then expected 4224')
        assert.equal(tester, 2, 'expected 2 passes to run before I ran')
        return 99
      })
      .then(function(r){
        assert.equal(r,99, 'sync close expected 99')
      })
      .then(done).catch(done)
    })

    it('async',function(done){
      var tester = 0

      p.then(function(){
        return 2468
      })
      .pass(function(r,next){
        if(r!=2468)throw new Error('first pass expected 2468');
        setTimeout(function(){
          tester=tester*2
          next()
        }, 20)
      })
      .pass(function(r,next){
        if(r!=2468)throw new Error('second pass expected 2468. Got '+r);
        setTimeout(function(){
          tester=(tester+1)*2
          next()
        }, 10)
      })
      .pass(function(r,next){
        if(r!=2468)throw new Error('third pass expected 2468 - '+r);
        setTimeout(function(){
          tester=tester*2
          next()
        }, 10)
      })
      .then(function(r){
        if(r!=2468)throw new Error('then expected 2468. Got '+r);
        if(tester!=8)throw new Error('expected 3 passes to total 8 before I ran. Got '+tester);
        return 969
      })
      .then(function(r){
        if(r!=969)throw new Error('async close expected 969. Got '+r);
        if(tester!=8)throw new Error('expected 3 passes to total 8 before I quit. Got '+tester);
      })
      .then(done).catch(done)
    })

    it('mix-pass-past',function(done){
      var tester = 0

      p.then(function(){
        return 22
      })
      .past(function(r){
        if(r!=22)throw new Error('second pass expected 22 - '+r);
        ++tester
        return 44
      })
      .pass(function(r,next){
        if(r!=22)throw new Error('first pass expected 22');
        setTimeout(function(){
          ++tester
          next()
        }, 30)
      })
      .pass(function(r,next){
        if(r!=22)throw new Error('first pass expected 22');
        setTimeout(function(){
          ++tester
          next()
        }, 10)
      })
      .past(function(r){
        if(r!=22)throw new Error('second pass expected 22 - '+r)
        ++tester
        return 7899
      })
      .then(function(r){
        if(r!=22)throw new Error('then expected 22');
        if(tester!=4)throw new Error('expected 4 passes to run before I ran. Got '+tester)
        return 99
      })
      .then(function(r){
        if(tester!=4)throw new Error('expected 4 passes before i close, to run before I ran. Got '+tester)
        if(r!=99)throw new Error('close expected 99')
      })
      .then(done).catch(done)
    })

    it('#complex',function(done){
      var scope = {test:33}
      var writeFile = function(content){
        if(content!='some promise file content')throw new Error('expected some promise file content to start file writing. Got type '+typeof(content));
        if(this.test!=33)throw new Error('expected this.test==33');
        var promise = ackP.start().then(function(){
          return this
        },this)
        return promise
      }
      var paramDirs = function(content){
        if(content!='some promise file content')throw new Error('expected some promise file content to start dir paraming. Got type '+typeof(content));
        if(this.test!=33)throw new Error('expected this.test==33');
        var promise = ackP.start().then(function(){
          return this
        },this)
        return promise
      }

      p.next(function(next){
        setTimeout(function(){
          next('some promise file content')
        },5)
      })
      .pass(function(next){
        setTimeout(function(){
          next(1233)
        }, 10)
        this.testing=33
      })
      .past(paramDirs,scope)
      .then(function(content){
        if(content!='some promise file content')throw new Error('Expected some promise file content. Got type '+typeof(content))
        return content
      })
      .then(writeFile,scope)
      .then(function(File){
        if(File.test!=33)throw new Error('expected File.test==33');
      })
      .then(function(){
        if(arguments.length!=0)throw new Error('Expected no arguments. Got '+arguments.length)
      })
      .then(done).catch(done)
    })
  })

  describe('#join',function(){
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
      getError = ackP.start().then(function(){
        var e = new Error('planned join error')
        e.name = 'getError'
        throw(e)
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
      var pp = p.join(getError)
      .then(function(pictures){
        throw new Error('i should have never been called');
      })
      .catch('geterror',function(e){
        assert.equal(e.name, 'getError')
      })
      pp.catch(done).then(done)
    })
  })

  describe('#all',function(){
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

    it('empty',function(done){
      p.all([]).then(done).catch(done)
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
  })

  describe('#map',function(){
    var array

    beforeEach(function(){
      array = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
    })

    it('static',function(done){
      p.map(array,function(item,index,len){
        if(item!=array[index])throw new Error('array item mismatch');
        if(len!=array.length)throw new Error('array length mismatch');
        return item + 1
      }).then(function(newarray){
        if(newarray.length != array.length)throw new Error('0.0 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
        if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
      })
      .then(done).catch(done)
    })

    it('binded',function(done){
      p.bind({ace:14})
      .map(array,function(item,index,len){
        assert.equal(this.ace, 14)
        if(item!=array[index])throw new Error('array item mismatch');
        if(len!=array.length)throw new Error('array length mismatch');
        return item + 1
      }).then(function(newarray){
        if(newarray.length != array.length)throw new Error('0.0 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
        if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
      })
      .then(done).catch(done)
    })

    describe('object',function(){
      it('static',function(done){
        var staticob = {a:0,b:1,c:2,d:3,e:4}
        p.map(staticob,function(item,index,len){
          assert.equal(item, staticob[index])
          assert.equal(len, Object.keys(staticob).length)
          return item + 1
        }).then(function(newob){
          if(Object.keys(newob).length != Object.keys(staticob).length){
            throw new Error('0.0 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
          }

          for(var x in newob){
            assert.equal(staticob[x]+1, newob[x])
          }
        })
        .then(done).catch(done)
      })

      it('static-empty',function(done){
        p.map({},function(item,index,len){
          throw new Error('should never have been called')
        })
        .set().then(done).catch(done)
      })

      it('static-none',function(done){
        p.map(function(item,index,len){
          throw new Error('should never have been called')
        })
        .then(done).catch(done)
      })
    })

    it('static-promise',function(done){
      p.map(array,function(item,index,len){
        if(item!=array[index])throw new Error('array item mismatch');
        if(len!=array.length)throw new Error('array length mismatch');
        return ackP.start().then(function(){
          return item + 1
        })
      })
      .then(function(newarray){
        if(newarray.length != array.length)throw new Error('0.0 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
        if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
      })
      .then(done).catch(done)
    })

    it('concurrency',function(done){
      p.map(array,function(item,index,len){
        if(item!=array[index])throw new Error('array item mismatch');
        if(len!=array.length)throw new Error('array length mismatch');

        return ackP.start().next(function(next){
          setTimeout(function(){
            next(item + 1)
          }, 10)
        })
      },{concurrency:5})
      .then(function(newarray){
        if(newarray.length != array.length)throw new Error('0.1 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
        if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
      })
      .then(done).catch(done)
    })

    it('concurrency-promise',function(done){
      p.then(function(){
        return array
      })
      .map(function(item,index,len){
        if(len!=array.length)throw new Error('array length mismatch');
        if(item!=array[index])throw new Error('array item mismatch');

        return ackP.start().next(function(next){
          setTimeout(function(){
            next()
          }, 5)
        })
        .pass(function(next){
          setTimeout(function(){
            next(89)
          }, 10)
        })
        .then(function(){
          return item + 1
        })
      },{concurrency:5})
      .then(function(newarray){
        if(newarray.length != array.length)throw new Error('0.1 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
        if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
      })
      .then(done).catch(done)
    })

    it('iteration-error',function(done){
      p.map(array,function(item,index,len){
        if(index==2){
          throw 'mid-iteration-error';
        }
      })
      .then(function(newarray){
        throw new Error('i should not be running');
      })
      .catch('mid-iteration-error',function(){
        done()
      }).catch(done)
    })

    it('iteration-sub-error',function(done){
      p.map(array,function(item,index,len){
        if(index==2){
          return ackP.start().callback(function(callback){
            setTimeout(function(){
              var e = new Error('mid-iteration-error')
              e.name = 'mid-iteration-error'
              callback(e)
            }, 30)
          })
        }
      })
      .then(function(newarray){
        throw 'i should not be running';
      })
      .catch('mid-iteration-error',function(){
        done()
      }).catch(done)
    })
  })

  describe('#each',function(){
    it('simple',function(done){
      var spot=0, orgArray = [1,2,3,4]

      p.set(orgArray)
      .each(function(v,i){
        assert.equal(i,spot)
        ++spot
      })
      .then(function(array){
        assert.equal(array[0], 1)
        assert.equal(array[3], 4)
        assert.equal(array, orgArray)
      })
      .then(done).catch(done)
    })

    it('async',function(done){
      var spot=0, orgArray = [1,2,3,4]

      p.set(orgArray).each(function(v,i){
        var delay = 20-i*2
        return ackP.start().delay(delay)
        .then(function(){
          assert.equal(i,spot)
          ++spot
          return true
        })
      })
      .then(function(array){
        assert.equal(array[0], 1)
        assert.equal(array[3], 4)
        assert.equal(array, orgArray)
      })
      .then(done).catch(done)
    })
  })

  describe('#callback',function(){
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
      .set(22)
      .callback(function(callback){
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
        .callback(function(callback){
          callback('88')
        })
      })
      .then(function(r){
        throw 'i should not be called';
        assert.equal(r,33)
        assert.equal(isCyclic(p),false)
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
  })

  describe('#if',function(){
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
  })
})