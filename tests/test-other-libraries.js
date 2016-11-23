var ackP = require('../ack-p'),
  assert = require('assert'),
  bluebird = require('bluebird')

function purpose_fail(message){
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.status = 401;
  this.code = "purpose_fail";
  this.message = message || "No authorization token was found";
}
purpose_fail.prototype = Object.create(Error.prototype);

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

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

      describe('continues-with-error',function(){
        it('ack-p-error',function(done){
          var p6 = new Promise(function(resolve, reject){
            resolve(33)
          })
          .then(function(r){
            assert.equal(r,33)
            
            var pp = p.then(function(){
              throw new Error('expected this error');
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
            assert.equal(e.message, 'expected this error')
            done()
          })
        })
        
        it('ack-p-callback-error',function(done){
          var p6 = new Promise(function(resolve, reject){
            resolve(33)
          })
          .then(function(r){
            assert.equal(r,33)
            
            var pp = p
            .callback(function(callback){
              setTimeout(function(){
                callback( new Error('expected this error'), 'success' )
              }, 20)
            })
            .then(function(r){
              return r
              //done(new Error('should not get in here'));
            })

            return pp
          })
          .then(function(r){
            console.log('success', r)
            return done()
            throw new Error('ecma1 should not get in here');//purpose_fail error should have skipped this section
          })
          .catch(function(e){
            assert.equal(e.message, 'expected this error')
            done()
          })
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
}