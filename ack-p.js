"use strict";
var isPromiseLike = function isPromiseLike(potentialPromise, notThisPromise){
  return potentialPromise && potentialPromise.then && potentialPromise!=notThisPromise
}

function objectKeys(ob){
  var x,array = []
  for(x in ob)array.push(x)
  return array
}

/** constructor. Invoke by new ackPromise()
  @resolver - function(resolve,reject){}
*/
function ackPromise(resolver){
  return new ackP()
  .next(function(next){
    resolver(next, next.throw)
  })
}

/** all arguments are used to jump start a thenable promise */
ackPromise.resolve = function(v0,v1,v2,v3){
  var promise = new ackP()
  promise = promise.set.apply(promise,arguments)
  return promise
}

ackPromise.start = function(){
  return new ackP()
}

ackPromise.all = function(){
  var p = ackPromise.start()
  return p.all.apply(p, arguments)
}

/** Expects a function, where that function expects that it's last argument will be a callback. Returns wrapper of defined function, that when called, returns a promise of calling defined function */
ackPromise.promisify = function(method){
  return function(){
    var args = Array.prototype.slice.apply(arguments)
    
    return new ackPromise(function(res, rej){
      args.push(function(err){
        if(err)return rej(err)
        var args = Array.prototype.slice.apply(arguments)
        args.shift(args)//remove first
        res.apply(this, args)
      })
      method.apply(this, args)
    })
  }
}

ackPromise.method = function(method){
  return function(){
    var Promise = new ackPromise.start()
    return Promise.set.apply(Promise, arguments).then(method)
  }
}

ackPromise.getErrorType = function(error){
  var isNamed = error.name && error.name.toLowerCase!=null
  var isCode = error.code && (error.code.toLowerCase!=null || Number(error.code))

  if(isCode && error.name=='Error'){
    return error.code
  }

  if(isNamed){
    return error.name
  }
}

ackPromise.isErrorType = function(error, type){
  if(error==null)return false

  if(error.constructor && type == error.constructor)
    return true

  var eName = ackPromise.getErrorType(error)
  if(
      eName
  &&  (
          eName==type
      ||  (eName.toLowerCase && eName.toLowerCase()==type.toLowerCase())
      )
  ){
    return true
  }

  return false
}

ackPromise.callback4callback = function(method, promise, bind){
  return function(){
    var args = Array.prototype.slice.call(arguments)
    var next = args.pop()
    var processor = ackPromise.getNextCallback(next, promise)

    if(method.length){
      args[method.length-1] = processor
    }else{
      args.push(processor)
    }

    method.apply(bind||this,args)
  }
}

ackPromise.createIf = function(promise, condition, $scope, onTrue, isTruthMode){
  isTruthMode = isTruthMode==null ? true : isTruthMode
  var isMethod = condition && condition.constructor && condition.constructor==Function

  if(isMethod){
    var processCondition = function(args, next, scope){
      next.call(scope, condition.apply(scope,args))
    }
  }else{
    var processCondition = function(args, next, scope){
      var result = args[0]===condition
      next.call(scope, result)
    }
  }

  var ifMethod = function(){
    var args = Array.prototype.slice.call(arguments)
    var next = args.pop()//last argument will be next method to call

    processCondition(args, function(result){
      var isVal = (isTruthMode && result==true) || (!isTruthMode && result==false)
      if(isVal){
        onTrue.call(this, args, next)//onTrue.call(this, args, next)
      }else{
        next.apply(next, args)//pass along args cause i didn't run
      }
    }, this)
  }

  return promise.next(ifMethod, $scope)
}

ackPromise.getNextCallback = function(next, promise){
  return function(){
    if(arguments[0]!=null){//1st arg is error!
      return promise['throw'].call(promise, arguments[0])
    }
    var args = Array.prototype.slice.call(arguments)
    args.shift()//remove error
    next.apply(next, args)
  }
}










function ackP(){
  this._promise0 = true//bluebird compatibility
  this.data = {waiting:0}
  return this.processor()//fire
}

ackP.prototype.processor = function(){
  this.values = Array.prototype.slice.apply(arguments)
  if(!this.data || !this.data.task){
    return// this
  }

  var $scope={
    args:Array.prototype.slice.call(arguments)//args that can be manipulated
  }

  var first = $scope.args

  var thisTask = this.data.task
  var context = thisTask.context || this.data.context || this.nextContext || this//never use outside arguments.context as context can be changed by bind()
  this.data.waiting=1//indicate in-process

  /* async callback method */
    var $this = this
    if(thisTask.isAsync===true){//if callback required, how is it defined. Pipe=last-arg-as-callback
      var nPos = thisTask.method.length===0 ? -1 : thisTask.method.length-1

      var oneTimeCall = false
      var oneTimeMethod = function(){
        var innerArgs = Array.prototype.slice.call(arguments)

        var then = function(){
          if($this.inpass){
            --$this.inpass.count

            if($this.inpass.count>0){
              return// $this
            }
            return $this.inpass.lastProm.runNextPromise()
          }
          return $this.runNextPromise()
        }

        if(arguments.length && isPromiseLike(arguments[0], $this)){//result is promise
          $this.runSubPromise(arguments[0], thisTask, innerArgs).then(then)
        }else{
          //$this.values = innerArgs
          if(thisTask && !thisTask.isPass){
            $this.values = innerArgs
          }
          then()
        }
      }

      oneTimeMethod['throw'] = function(){
        return $this['throw'].apply($this, arguments)
      }

      if(nPos>=0){
        $scope.args[nPos] = oneTimeMethod//last assigned argument position will be next call
      }else{
        $scope.args.push(oneTimeMethod)//last argument will be next call
      }
    }
  /* end: async callback method */

  if(thisTask.isPass===true){
    if(thisTask.isAsync===true){
      if(!this.inpass){
        this.inpass={count:1}
      }else{
        ++this.inpass.count
      }
    }

    if(this.inpass)this.inpass.lastProm = this
  }

  try{
    var result = thisTask.method.apply(context, $scope.args)//args from last next call are directly fed in
  }catch(e){
    if(e.constructor==String){
      var eName = e
      e = new Error(e)
      e.name = eName
    }

    if(!e.code && e.message){
      e.code = e.message
    }

    //try to indicate which method has failed
    try{
      e.method = thisTask.method//maybe read-only and so may error
    }catch(e){}

    this['throw'].call(this, e)
    return// this
  }

  if(thisTask.isPass===true){
    return this.runNextPromise()
  }

  if(thisTask.isAsync===true)return;

  if(isPromiseLike(result, this)){//result is promise
    return this.runSubPromise(result, thisTask)
    .then(function(){
      $this.runNextPromise()
    })
  }

  if(!this.data){
    return// this
  }

  if(this.inpass!=null){//pass over
    this.inpass.count = null
    this.inpass.lastProm = null
    this.inpass = null
  }

  if(result==this || result==null && typeof(result)==='undefined'){
    this.values = null//if we are not passing previous result, then lets set
  }else{
    this.values = [result]//if we are not passing previous result, then lets set
  }

  if(this.data.getNextPromise!=null){//we need to trigger our next task
    return this.runNextPromise()
  }

  this.data.waiting=0//no longer waiting for another task. This is key for a then being added to a fully exectured chain

  this.clearMem()

  return// this
}

ackP.prototype['throw'] = function(err){
  if(err && err.constructor==String){
    var s = err
    err = new Error(err)
    err.name = s
  }

  this._rejected = err
  var _rejectedCaught = false
  this._rejectedCaught = function(v){
    return _rejectedCaught || (_rejectedCaught=v)
  }
  if(nativePromiseThen)this.then = ackP.rejectedThen
  //var $this = this
  var promiseCatcher = this.seekPromiseCatcher()
  this.tryForFinally()

  if(promiseCatcher){
    try{
      return this.throwPromiseCatcher(err, promiseCatcher)
    }catch(e){
      console.log('ack-p throw promise catcher error',e)
    }//any error thrown above, should fall throw
  }

  if(this.data && this.data.getNextPromise){
    var np = this.data.getNextPromise()
    var isNativeNext = np.data.task.method.toString()==nativePromiseThenString
    
    if(isNativeNext){
      return np.data.task.method( Promise.reject(err) )
    }

    return np['throw'].call(np, err)//cascade error reporting
  }

  setTimeout(function(){
    if(_rejectedCaught)return

    this.tryForFinally()

    var promiseCatcher = this.seekPromiseCatcher()
    if(promiseCatcher){
      return this.throwPromiseCatcher(err, promiseCatcher)
    }
    
    if(console.log){
      var msg = err.message || ''
      console.log('\x1b[31mUncaught Promise Error '+msg+'\x1b[0m')
      console.log(err)
    }else{
      throw err
    }
  }.bind(this), 1)
  //throw err
  //return err
}

ackP.prototype.tryForFinally = function(){
  var final = this.seekFinally()

  if(final){
    final.data.task.method()
  }
}

ackP.prototype.seekFinally = function(allowSelf){
  if(this.data && this.data.task && this.data.task['finally'] && allowSelf==null){
    return this
  }

  if(this.data && this.data.getNextPromise){
    return this.data.getNextPromise().seekFinally()
  }
}

ackP.prototype.runSubPromise = function(result, thisTask){
  var $this = this,
      closingTask = function(){
        if(thisTask && !thisTask.isPass){
          $this.values = Array.prototype.slice.call(arguments)
        }
      }

  result = result.then(closingTask)
  ['catch'](function(e){
    //e = e.cause || e//bluebird may have wrapped the true error
    $this['throw'].call($this, e)//result promise catcher
  })

  return result
}

ackP.prototype.runNextPromise = function(){
  if(this._rejected){
    return
  }

  if(this.values && this.values.length){
    return this.runNextPromiseWithValueArray(this.values)
  }

  return this.runNextPromiseWithValueArray()
  //this.values = null//intended to clear memory
}

ackP.prototype.runNextPromiseWithValueArray = function(valueArray){
  if(!this.data){
    return// this
  }
  var np = this.data.getNextPromise ? this.data.getNextPromise() : null
  if(!np){
    this.data.waiting = 0;return// this
  }

  var isByPass = this.inpass && this.inpass.count && np.data && np.data.task && !np.data.task.isPass
  if(isByPass)return

  //np.paramData()
  //var shares
  np.data.waiting = -1
  np.nextContext = np.nextContext || this.nextContext// || this.data.context
  np.data.context = np.data.context || this.nextContext// || this.data.context
  np.inpass = this.inpass
  this.clearMem()
  this.nextContext = null//clear mem

  np.values = valueArray
  return np.processor.apply(np, valueArray)
}

ackP.prototype.runCatch = function(err, catcher){
  try{
    var caught = catcher.call(this.nextContext || this, err)
  }catch(e){
    var _rejectedCaught = false
    this._rejectedCaught = function(v){
      return _rejectedCaught || (_rejectedCaught=v)
    }
    this._rejected = e
    caught = e
  }

  if(isPromiseLike(caught)){
    var $this = this
    return caught.then(function(){
      $this.runNextPromiseWithValueArray( Array.prototype.slice.call(arguments) )
    })
  }

  var argArray=[]
  if(caught!==null){
    argArray.push(caught)
  }
  this.values = argArray
  var r = this.runNextPromiseWithValueArray(argArray)
  this.clearMem()
  return r
}

ackP.prototype.getLastPromise = function(){
  if(!this.data || !this.data.getNextPromise){
    return this
  }
  return this.data.getNextPromise().getLastPromise()
}

ackP.prototype['catch'] = function(typeOrMethod, method){
  var newProm = this.next(function(){
    var args = Array.prototype.slice.call(arguments)
    var next = args.pop()
    next.apply(this, args)
  })

  newProm._rejected = null

  this.catchers = this.catchers || {}
  if(method){
    switch(typeof(typeOrMethod)){
      case 'string':
        var type = typeOrMethod.toLowerCase()
        this.catchers['catch'+type] = method;
        if(this._rejected && !this._rejectedCaught() && ackPromise.isErrorType(this._rejected, type)){//error already happend
          this._rejectedCaught(true)
          this.runCatch(this._rejected, method)//method.call(this, this._rejected)
        }
        break;
      //case 'function':break;
      default:{
        this.catchers.catch_type_array = this.catchers.catch_type_array || []
        this.catchers.catch_type_array.push({method:method, type:typeOrMethod})
        if(this._rejected && !this._rejectedCaught() && ackPromise.isErrorType(this._rejected, typeOrMethod)){
          this._rejectedCaught(true)
          this.runCatch(this._rejected, method)//method.call(this, this._rejected)
        }
      }
    }
  }else{
    method = typeOrMethod
    this.catchers.catchAll = typeOrMethod
    if(this._rejected && !this._rejectedCaught()){
      this._rejectedCaught(true)
      this.runCatch(this._rejected, method)//method.call(this, this._rejected)
    }
  }

  if(this._rejected && !this._rejectedCaught()){
    newProm._rejectedCaught = this._rejectedCaught
    newProm._rejected = this._rejected
    if(nativePromiseThen)this.then = ackP.rejectedThen
  }

  return newProm
}
/** alias for compatibility with earlier ECMAScript version */
ackP.prototype.caught = ackP.prototype['catch']

/**
  @condition - if condition is not a method, then value must strictly match condition. If condition is method, condition only must return truthy
*/
ackP.prototype['if'] = function(condition,method,scope){
  return ackPromise.createIf(this, condition, scope, function(args, next){
    var mr = method.apply(this, args)
    next.call(next, mr)
  })
}

ackP.prototype.ifNot = function(condition,method,scope){
  var processor = function(args, next){
    var mr = method.apply(this, args)
    next.call(next, mr)
  }
  return ackPromise.createIf(this, condition, scope, processor, false)
}

ackP.prototype.ifNext = function(condition,method,scope){
  var processor = function(args,next){
    if(method.length){
      args[method.length-1] = next
    }else{
      args.push(next)
    }

    method.apply(this,args)
  }
  return ackPromise.createIf(this, condition, scope, processor)
}

ackP.prototype.ifCallback = function(condition,method,scope){
  return ackPromise.createIf(this, condition, scope, function(args,next){
    var cb = ackPromise.getNextCallback(next, this)

    if(method.length)
      args[method.length-1] = cb
    else
      args.push(cb)

    method.apply(this,args)
  })
}

ackP.prototype.getNewData = function(){
  return {waiting:0}
}

ackP.prototype.paramData = function(){
  this.data = this.data || this.getNewData();return this
}

ackP.prototype.setNextPromise = function(np){
    this.data.getNextPromise = function(){
      return np
    }
    np.nextContext = this.nextContext
    if(this._rejected){
      np._rejectedCaught = this._rejectedCaught
      np._rejected = this._rejected
      if(nativePromiseThen)np.then = ackP.rejectedThen
    }

    return np
}

ackP.prototype.assertMethod = function(method){
  if(method==null){
    var msg = 'Promise thenable undefined. Most likely due to a Promise.then() that is an undefined variable.'
    this['throw'].call(this,msg)
    var e = new Error(msg)
    e.name = msg
    throw e
  }
}

ackP.prototype.add = function(options){
  this.assertMethod(options.method)
  this.paramData()

  if( isPromiseLike(options.method) ){
    var nextp = options.method
    options.method = function(){return nextp}
    var newp = ackPromise.start().add(options)
    return this.setNextPromise( newp )
  }

  if(this.data.getNextPromise){
    return this.data.getNextPromise().add(options)
  }else if(this.data.task){
    var np = ackPromise.start()
    this.setNextPromise(np)
    np.data.waiting = 1
    np.add(options)

    if(this.data.waiting==0){
      this.runNextPromise()
    }

    return np
  }

  this.data.task = options//first added task

  if(this.data.waiting===0){//?already done process, put back into process
    this.processor.apply(this, this.values)
  }

  return this
}

//async-method whose input is passed exactly as output AFTER the last-method(callback) is called
ackP.prototype.pass = function(method,scope){
  //this.checkPassMode()
  return this.add({method:method, context:scope, isPass:true, isAsync:true})
}

function getMethodNameList(ob){
  var array = []
  for(var x in ob){
    if(ob[x] && ob[x].constructor && ob[x].constructor == Function){
      array.push(x)
    }
  }
  return array.join(',')
}

/** (name, args0, arg1, arg2) */
ackP.prototype.call = function(name){
  var args = Array.prototype.slice.call(arguments)
  args.shift()//remove name argument
  return this.then(function(){
    if(arguments.length && arguments[0][name]){
      return arguments[0][name].apply(arguments[0], args)
    }
    var msg = 'promise.call "'+name+'" is not a function.'
    if(arguments.length){
      msg += ' Function list: '+getMethodNameList(arguments[0])
    }
    var e = new Error(msg)
    e.name='not-a-function'
    throw e
  })
}

/** (name, args0, arg1, arg2) */
ackP.prototype.bindCall = function(name){
  var args = Array.prototype.slice.call(arguments)
  args.shift()//remove name argument
  return this.then(function(){
    if(this[name]){
      return this[name].apply(this, args)
    }
    var msg = 'promise.bindCall "'+name+'" is not a function.'
    msg += ' Function list: '+getMethodNameList(this)
    var e = new Error(msg)
    e.name='not-a-function'
    throw e
  })
}

/** promise result will become "this" context */
ackP.prototype.bindResult = function(){
  return this.then(function(v){
    this.bind(v)
    return ackPromise.start().set( Array.prototype.slice.call(arguments) ).spread()
  })
}

ackP.prototype.bind = function($this){
  if( $this!=this && isPromiseLike($this) ){
    var passon = {}
    return this.then(function(){
      passon.result = Array.prototype.slice.call(arguments)
    })
    .then($this)
    .bindResult()
    .set(passon).get('result').spread()
  }

  this.paramData()
  if(!this.data.task){
    this.data.context = $this
  }
  this.nextContext = $this
  return this
}

ackP.prototype.singleGet = function(name){
  if(!isNaN(name) && name < 0){//negative number array index? array[-1] = array[array.length-1]
    return this.then(function(v){
      if(v && v.constructor==Array){
        return v[ v.length + name ]
      }
      return v[name]
    })
  }

  return this.then(function(v){
    return v[name]
  })
}

ackP.prototype.get = function(){
  var args = Array.prototype.slice.call(arguments)
  var promise = this
  for(var aIndex=0; aIndex < args.length; ++aIndex){
    promise = promise.singleGet(args[aIndex])
  }
  return promise
}

ackP.prototype.set = function(){
  var args = Array.prototype.slice.call(arguments)
  return this.next(function(){
    var next = Array.prototype.slice.call(arguments).pop()
    next.apply(next, args)
  })
}
ackP.prototype.return = ackP.prototype.set//respect the bluebird alias
ackP.prototype.resolve = ackP.prototype.set//alias for other promise libaries

ackP.prototype.delay = function(t){
  return this.next(function(){
    var args = Array.prototype.slice.call(arguments),
      next = args.pop()
    setTimeout(function(){
      next.apply(next, args)
    }, t)
  })
}

ackP.prototype['finally'] = function(method,scope){
  var rtn = this.add({method:method, context:scope, isPass:true, isAsync:false, finally:true})

  if(this._rejected){
    method()
  }

  return rtn
}

//sync-method whose input is passed exactly as output to the next method in chain
ackP.prototype.ignore = function(method,scope){
  return this.add({method:method, context:scope, isPass:true, isAsync:false})
}
ackP.prototype.past = ackP.prototype.ignore//respect the bluebird
ackP.prototype.tap = ackP.prototype.ignore//respect the bluebird

/** when this thenable is run, the first argument is this promise in it's current state */
ackP.prototype.reflect = function(method,scope){
  var reflect = function(){
    var args = Array.prototype.slice.call(arguments)
    args.unshift(this)
    method.apply(scope||this, args)
  }

  return this.add({method:reflect, context:this, isPass:true, isAsync:false})
}

//async-method
ackP.prototype.next = function(method,scope){
  return this.add({method:method, context:scope, isAsync:true})
}

ackP.prototype.then = function(method,scope){

  return this.add({method:method, context:scope, isAsync:false})
}
ackP.prototype.method = ackP.prototype.then//respect the blue bird

/** this function will be made into ackP.prototype.then WHEN a promise error occurs. It makes catching errors flow properly between ecma6 promises and ackP */
ackP.rejectedThen = function(method,scope){
  /* !extremely important! - This connects ackP promises with native promises */
  if(this._rejected && method.toString()==nativePromiseThenString ){
    this._rejectedCaught(true)//its the next libraries problem
    throw this._rejected//This will reject to the native promise. I have already been rejected and a native promise is trying to chain onto me
  }

  return this.add({method:method, context:scope, isAsync:false})
}

ackP.prototype.spread = function(method,scope){
  if(!method){
    return this.add({method:function(){
      var args = Array.prototype.slice.call(arguments)
      var next = args.pop()
      next.apply(next,args[0])
    }, context:this, isAsync:true})
  }else{
    return this.add({method:function(a){
      return method.apply(this, a)}, context:scope, isAsync:false
    })
  }
}

ackP.prototype.spreadCallback = function(method,scope){
  return this.callback(function(){
    var args = Array.prototype.slice.call(arguments)
    var callback = args.pop()
    //args = args[0]
    if(args.length){
      switch(args[0].constructor){
        case String: case Boolean: case Object:
          args = [args[0]]
          break;
        case Array:
          args = args[0]
          break;

        default:args=[]
      }

      args.push(callback)
    }
    method.apply(this, args)
  }, scope)
}

//async-method aka promisify
ackP.prototype.callback = function(method,scope){
  this.assertMethod(method)//since an override method is provided, lets check the one we are recieving now instead of when we need it

  var fireMethod = function(){
    
    var bind = scope||this
    var prom = ackPromise.start()
    var args = Array.prototype.slice.call(arguments)

    //prom = prom.set.apply(prom,args)//.spread()

    var myMethod = ackPromise.callback4callback(method, prom, bind)
    return prom
    .next(function(){
      var next = Array.prototype.slice.call(arguments).pop()
      args.push(next)
      return myMethod.apply(bind, args)
    })
    return prom
  }
  return this.add({method:fireMethod, scope:scope, isAsync:false})
}

ackP.prototype.clearMem = function(){
  this.data = null;
  return this
}

ackP.prototype.seekPromiseCatcher = function(allowSelf){
  if(this.catchers && allowSelf==null){
    return this
  }

  if(this.data && this.data.getNextPromise){
    return this.data.getNextPromise().seekPromiseCatcher()
  }
}

ackP.prototype._rejectedCaught = function(){
  return false
}

ackP.prototype.throwPromiseCatcher = function(e, promiseCatcher){
  if(promiseCatcher.catchers.catch_type_array){
    for(var i=0; i < promiseCatcher.catchers.catch_type_array.length; ++i){
      var isType = ackPromise.isErrorType(e, promiseCatcher.catchers.catch_type_array[i].type)
      if(isType){
        this._rejectedCaught(true)
        //var r = promiseCatcher.catchers.catch_type_array[i].method.call(this,e)
        var catcher = promiseCatcher.catchers.catch_type_array[i].method
        promiseCatcher.runCatch(e, catcher)
        return this
      }
    }
  }

  /* error string type catchers */
    if(e && e.name && e.name.toLowerCase){
      var eName = e.name.toLowerCase()
      if(promiseCatcher.catchers['catch'+eName]){
        this._rejectedCaught(true)
        //var r = promiseCatcher.catchers['catch'+eName].call(this,e)
        var catcher = promiseCatcher.catchers['catch'+eName]
        promiseCatcher.runCatch(e, catcher)
        return this//r
      }
    }

    if(e && e.code){
      var isString = e.code.toLowerCase
      if(isString || Number(e.code)){
        var eName = isString ? e.code.toLowerCase() : e.code
        if(promiseCatcher.catchers['catch'+eName]){
          this._rejectedCaught(true)
          //var r = promiseCatcher.catchers['catch'+eName].call(this,e)
          var catcher = promiseCatcher.catchers['catch'+eName]
          promiseCatcher.runCatch(e, catcher)
          return this//r
        }
      }
    }

    if(e && e.message && e.message.toLowerCase){
      var eName = e.message.toLowerCase()
      if(promiseCatcher.catchers['catch'+eName]){
        this._rejectedCaught(true)
        //var r = promiseCatcher.catchers['catch'+eName].call(this,e)
        var catcher = promiseCatcher.catchers['catch'+eName]
        promiseCatcher.runCatch(e, catcher)
        return this//r
      }
    }
  /* end: error string type catchers */

  if(promiseCatcher.catchers.catchAll){
    this._rejectedCaught(true)
    //var r = promiseCatcher.catchers.catchAll.call(this,e)
    var catcher = promiseCatcher.catchers.catchAll
    promiseCatcher.runCatch(e, catcher)
    return this//r
  }

  var promiseCatcher = promiseCatcher.seekPromiseCatcher(false)//the current promise catcher we have didn't work out
  this.tryForFinally()
  if(promiseCatcher){
    return this.throwPromiseCatcher(e, promiseCatcher)
  }
}

ackP.prototype.all = function(){
  var args = Array.prototype.slice.call(arguments);
  //create handler function
  args.push(function(){
    if(arguments.length){
      var args = Array.prototype.slice.call(arguments)
      return args
    }
  })
  return this.join.apply(this, args)
}

//expected every argument but last is a running promise. Last argument is callback. Example: join(firePromiseA(),firePromiseB(),function(A,B){return 22}).then(function(r22){})
//if only one argument, then it is a single promise whos result will be passed along
ackP.prototype.join = function(/* promiseArrayOrPromise, promiseArrayOrPromise, joinMethod */){
  var joinPromise, next, $this = this

  var resultArray = []
      ,count = 0
      ,argSlice = Array.prototype.slice.call(arguments)//mutatable arguments
      ,isArg0Array = argSlice.length && argSlice[0] && argSlice[0].constructor==Array// && typeof argSlice[0]==='undefined'
      ,isPromMode = !isArg0Array && typeof argSlice[0]==='function'
      ,promiseArray = isArg0Array ? arguments[0] : argSlice

  if(argSlice[argSlice.length-1] && argSlice[argSlice.length-1].constructor == Function){
    var controller = argSlice.pop()//last arg is controller
    //function that is called when this function counts all promises completed
    var done = function(){
      var controlResult = ackPromise.start().set(resultArray).spread(controller, $this)
      controlResult.then(function(){
        next.apply(next, Array.prototype.slice.call(arguments))
        //$this.values = Array.prototype.slice.call(arguments)
        //$this.runNextPromise()
      })
    }
  }else{
    var done = function(){
      next.apply(next, [resultArray])
    }
  }

  var nextMethod = function(){//we will call $this instead of a next method
    var runTimeArgs = Array.prototype.slice.call(arguments)
    next = runTimeArgs.pop()//last argument is next method

    if(!isArg0Array && isPromMode){
      promiseArray = runTimeArgs[0]
    }

    if(!promiseArray.length){
      done();return
    }

    var processResult = function(i, v){
      resultArray[i] = v
      ++count//count a finishing promise
      if(count==promiseArray.length){//all promises have been accounted for
        done()
      }
    }

    var catcher = function(e){
      next['throw'](e)
    }

    promiseArray.forEach(function(v,i){
      if(isPromiseLike(v)){
        v.then(function(v){
          processResult(i,v)
        })['catch'](catcher)
      }else{
        processResult(i,v)
      }
    })
  }

  return $this.next(nextMethod)
}

/**
  (array|callback, callback, options)
  @options {concurrency}
*/
ackP.prototype.map = function(){
  var args = Array.prototype.slice.call(arguments)

  if(typeof(args[args.length-1])==='object'){//last is option
    var options = args.pop()
  }else{
    var options = {concurrency:0}//infinite
  }

  var conc = options.concurrency==null||isNaN(options.concurrency) ? 0 : options.concurrency
  var controller = args.pop()//last is controller
  var newArray = []

  var per = function(v,i,len){
    return ackPromise.start().then(function(){
      var r = controller.call(this, v, i, len)
      if(r && r.then){//fire controller's promise
        return r.then(function(newItem){
          newArray[i] = newItem
        })
      }else{
        newArray[i] = r
      }
    }, this)
  }

  var loopArray = function(arrOrOb, callback){
    if(!arrOrOb){
      return callback(null);
    }

    var v, wait=0,counter=0;
    if(arrOrOb.constructor===Array){
      var len = arrOrOb.length
      if(!len){
        callback(null,[])
      }

      var next = function(nx, i, $this){
        if(i==len){
          return;//no more loop
        }

        var prom = per.call($this, arrOrOb[i], i, len)
        .then(function(){
          ++counter
          if(counter==len){//fullment by equal array.length
            callback(null,newArray)
          }
        })['catch'](callback)

        if(conc>0){
          var rotation = (i+1) % conc
          if(rotation==0){
            return prom.then(function(){
              nx(nx,i+1,$this)
            })
          }
          ++wait;
          var nxPromise = nx(nx,i+1,$this)
          if(nxPromise){          
            return nxPromise.then(function(){
              --wait;
              if(wait==0){
                nx(nx,i+1,$this)
              }
            })
          }
        }

        return prom.then(function(){
          nx(nx, i+1, $this)
        })
      }

      next(next, 0, this)

      return;
    }

    //loop objects
    var len = objectKeys(arrOrOb).length
    if(!len)callback(null,{})
    for(var x in arrOrOb){
      v = arrOrOb[x];

      per.call(this, v, x, len)
      .then(function(){
        ++counter
        if(counter==len){//fullment by equal array len
          callback(null,newArray)
        }
      })['catch'](callback)
    }
  }

  if(args[0] && args[0].constructor!==Function){//we have array
    return this.callback(function(callback){
      loopArray.call(this, args[0], callback)
    })
  }

  return this.callback(function(array,callback){
    loopArray.call(this, array, callback)
  })
}

/** always returns original array */
ackP.prototype.each = function(func){
  return this.then(function(a){
    var prom = ackPromise.start()
    
    for(var i=0; i < a.length; ++i){
      prom = prom.set(a[i],i,a).then(function(){
        return func.apply(this,arguments)
      }.bind(this))
    }

    return prom.set.apply(prom, arguments)
  })
}

//bluebird compatibility
ackP.prototype._then = function(didFulfill,didReject,didProgress,receiver,internalData){
  return this.add({method:function(){
    didFulfill.apply(receiver, arguments)//success
  }, isAsync:false})
  .catch(function(){
    didReject.apply(receiver,arguments)//reject
  })
}




if(typeof(module)!='undefined'){
  module.exports = ackPromise
  //module.exports.__dirname = __dirname
}
















// Used to resolve the internal `[[Class]]` of values
var toString = Object.prototype.toString;

// Used to resolve the decompiled source of functions
var fnToString = Function.prototype.toString;

// Used to detect host constructors (Safari > 4; really typed array specific)
var reHostCtor = /^\[object .+?Constructor\]$/;

// Compile a regexp using a common native method as a template.
// We chose `Object#toString` because there's a good chance it is not being mucked with.
var reNative = RegExp('^' +
  // Coerce `Object#toString` to a string
  String(toString)
  // Escape any special regexp characters
  .replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&')
  // Replace mentions of `toString` with `.*?` to keep the template generic.
  // Replace thing like `for ...` to support environments like Rhino which add extra info
  // such as method arity.
  .replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

function isNative(value) {
  var type = typeof value;
  return type == 'function'
    // Use `Function#toString` to bypass the value's own `toString` method
    // and avoid being faked out.
    ? reNative.test(fnToString.call(value))
    // Fallback to a host object check because some environments will represent
    // things like typed arrays as DOM methods which may not conform to the
    // normal native pattern.
    : (value && type == 'object' && reHostCtor.test(toString.call(value))) || false;
}

var nativePromiseThen, nativePromiseThenString;
var isNativePromised = typeof(Promise)!='undefined' && Promise && Promise.resolve
if(isNativePromised){
  Promise.resolve().then(function(){
    var testerP = {}

    testerP.then = function(nativeThen){
      nativePromiseThen = nativeThen
      nativePromiseThenString = nativeThen.toString()
    }
    return testerP
  })
  .then(function(){})//triggers native promise to invoke my promise
}