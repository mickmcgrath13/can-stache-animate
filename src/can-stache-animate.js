var defaultAnimations = require('./animations');
var isPlainObject = require('can-util/js/is-plain-object/');
var isPromiseLike = require('can-util/js/is-promise-like/');

require("can-util/dom/events/inserted/inserted"); 
require("can-util/dom/events/removed/removed"); 
require('can-stache-animate/can-util/dom/mutate/mutate');



var canStacheAnimate = {};

canStacheAnimate.duration = 400;
canStacheAnimate.animationsMaps = [];
canStacheAnimate.animations = {};

canStacheAnimate.registerAnimations = function(animationsMap){
	this.animationsMaps.push(animationsMap);

	for(var key in animationsMap){
		if(animationsMap.hasOwnProperty(key)){
			this.registerAnimation(key, animationsMap[key]);
		}
	}
};

/*
 * @function registerAnimation
 *
 * @description adds an animation value with `key` to the registered animations map after expanding it
 * 
 * @prop key
 * the identifier for the animation
 *
 * @prop value
 * The animation - can be one of the following:
 *
 * a string - used to alias a mixed-in animation
 * 
 * a function - will be used as the animation's `run` method
 *
 * a promise - will be used as the animation's `run` promise
 *
 * an object - the object should have the following properties:
 *   before - Called prior to the `run` method
 *   run    - This method is required if an object is provided.   
 *   after  - Called after the `run` method
 *
 */
canStacheAnimate.registerAnimation = function(key, value){
	var animation = this.expandAnimation(value),
			animationIsObject = isPlainObject(animation),
			animationHasRunProperty = !!animation.run;

	//animation should be an object with at least a run method
	if(animationIsObject && animationHasRunProperty){
		this.animations[key] = this.createHelperFromAnimation(animation);
	}else{
		if(!animationIsObject){
			console.warn("Invalid animation type for '" + key + "'. Animation should be a string, a function, or an object.");
		}else if(!animationHasRunProperty){
			console.warn("Invalid `animation.run` value for '" + key + "'. `animation.run` is required.");
		}
	}

};

canStacheAnimate.expandAnimation = function(value){
	var animation = value;

	//animation is a string -> look up in existing animations
	if(typeof(animation) === 'string'){
		animation = this.getAnimationFromString(animation);
	}

	//animation is a function or promiseLike
	//				- expand to before, run, after
	if(typeof(animation) === 'function' || isPromiseLike(animation)){
		animation = {
			before: null,
			run: animation,
			after: null
		};
	}

	return animation;
};


/*
 * @prop animation
 * string value that represents an animation
 *
 * @prop animationsMap (optional)
 * If provided, it is used for additional lookups when `value` is a string
 */
canStacheAnimate.getAnimationFromString = function(animation){
	while(typeof(animation) === "string"){

		//if we find a registered animation, use that
		var finalAnimation = this.animations[animation];
		if(finalAnimation){
			animation = finalAnimation;
			break;
		}

		//check the animationsMap for another value
		animation = this.lookupAnimationInAnimationsMaps(animation);
	}
	return animation;
};


/*
 * @description
 * Look through all animation maps to see if the animation was given but not yet registered
 * 
 * @prop animation - should be a string
 */
canStacheAnimate.lookupAnimationInAnimationsMaps = function(animation){
	var returnVal, thisAnimation;
	for(var i = 0; i < this.animationsMaps.length; i++){
		thisAnimation = this.animationsMaps[i][animation];
		if(thisAnimation){
			returnVal = thisAnimation;
			break;
		}
	}
	return returnVal;

};

/*
 * @prop animation - {before, run, after}
 *   The values for each of the `before`, `run`, and `after` properties can be a string, object, a promise, or a function
 *     - string (starts with '.') - assumed to be a class, and that class will be applied
 *     - string (doesn't start with '.') - assumed to be the alias of a mixed-in animation
 *     - object - assumed to be a css object and will be applied directly (no animation) for both `before` and `after`
 *       					and will be animated via jQuery.animate for `run`
 *     - function - will be executed in the proper sequence
 *		 - promise - will be executed in the proper sequence
 *
 */
canStacheAnimate.createHelperFromAnimation = function(animation){

	var self = this,
			before = this.expandAnimationProp(animation, 'before'),
			run = this.expandAnimationProp(animation, 'run'),
			after = this.expandAnimationProp(animation, 'after'),
			stop = this.expandAnimationProp(animation, 'stop');

	//by this time, `run` should be a function or a promise, 
	//  and `before` and `after` should each be either a function, a promise, or null
	return function(ctx,el,ev){
	  var callMethod = function(method){
		  		//check if this helper has already been converted to an animation helper
					if(ev && ev.canStacheAnimate){
			    	return method(ctx, el, ev);
		    	}
			    return method(el, ev, self.getOptions(el, ev, animation));
	  		},

	  		makePromise = function(method, required, invalidTypeWarning){
	  			//check required
	  			if(!method && !required){
	  				return Promise.resolve(true);
	  			}

	  			//handle promise
	  			if(isPromiseLike(method)){
	  				return method;
	  			}

			    if(typeof(method) !== 'function'){
			    	console.warn(invalidTypeWarning);
	  				return Promise.resolve(true);
			    }else{
			    	var res = callMethod(method);
			    	if(res === false){
			    		return Promise.reject(res);
			    	}

			    	//animations aren't required to return anything
			    	if(typeof(res) === 'undefined'){
			    		return Promise.resolve(true);
			    	}

	  				return res;
			    }
	  		},
	  		invalidTypeWarnings = function(){
	  			var warnings = {};
	  			["before", "run", "after"].forEach(function(type){
	  				warnings[type] = "Invalid animation property type (`" + type + "`). Animation property should be a string, a function, or an object.";
	  			});
	  			return warnings;
	  		}(),
	  		isStopped = false,
	  		callStop = function(){
	  			isStopped = true;
			  	if(typeof(stop) !== 'function'){
			  		return false;
			  	}

			  	callMethod(stop);
		    	return false;
	  		};


	  return makePromise(before, false, invalidTypeWarnings.before).then(function(){
	  	var result = arguments[0];
	    //allow canceling of further animations (`run`, and `after`)
	    if(result === false || isStopped){
	      return callStop('before');
	    }

	    return makePromise(run, true, invalidTypeWarnings.run).then(function(){
		  	var result = arguments[0];

				//allow canceling of further animations (`after`)
	      if(result === false || isStopped){
		      return callStop('run');
	      }

	      return makePromise(after, false, invalidTypeWarnings.after).then(function(){
			  	var result = arguments[0];
					//call stop to reset if necessary
		      if(result === false || isStopped){
			      return callStop('after');
		      }
			  }, function(){
			  	return callStop('after');
			  });
		  }, function(){
		  	return callStop('run');
		  });
	  }, function(){
	  	return callStop('before');
	  });
	};
};

/*
 * converts an animation property into a function
 * @prop animation
 * The full animation object
 *
 * Each of `before`, `run`, `after`, and `stop` can be a string or function
 *     - string - assumed to be the alias of a registered animation
 *     - function - will be executed in the proper secquence
 *
 * @prop prop
 * 'before' | 'run' | 'after' | 'stop'
 *
 * @returns function
 * 
 */
canStacheAnimate.expandAnimationProp = function(animation, prop){

	var animationProp = animation[prop];

	if(!animationProp){
		return null;
	}

	// string - assumed to be the alias of a registered animation
	if(typeof(animationProp) === 'string'){
		return this.getAnimationFromString(animationProp);
	}

	// function - will be executed in the proper secquence
	if(typeof(animationProp) === 'function'){
		return animationProp;
	}

	console.warn("Invalid animation property type. Animation property should be a string or a function.");
	return null;
};

//returns options for a specific animation function
canStacheAnimate.getOptions = function(el, ev, animation){
	var duration = typeof(animation.duration) !== 'undefined' ? animation.duration : this.duration,
		opts = {
			duration: duration,

			canStacheAnimate: this, //do we need this reference?
			animation: animation //do we need this reference?
		};

	return opts;
};

canStacheAnimate.setDuration = function(duration){
	this.duration = duration;
};

canStacheAnimate.registerAnimations(defaultAnimations);

module.exports = canStacheAnimate;
