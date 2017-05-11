import $ from 'jquery';
import canStacheAnimate from 'can-stache-animate';

canStacheAnimate.registerAnimations({
	//hop cancels further animations
	hop:{
		before: function(vm, el, ev){
			return canStacheAnimate.makeAnimationPromiseJQuery(el,{
				"margin-top":"-20px"
			}, 400).promise().then(() => {
				return false;
			});
		},
		run: function(vm,el,ev){
			return canStacheAnimate.makeAnimationPromiseJQuery(el,{
				"margin-top":"0px"
			}, 400);
		}
	},

	dip:{
    before: function(vm, el, ev){
      return canStacheAnimate.makeAnimationPromiseJQuery(el,{
          "margin-top":"20px"
      }, 2000);
    },
    run: function(vm,el,ev){
      return canStacheAnimate.makeAnimationPromiseJQuery(el,{
          "margin-top":"0px"
      }, 2000);
    }
	},

	//hop2 & dip2 use only a function
	hop2:function(vm,el,ev){
		return canStacheAnimate.makeAnimationPromiseJQuery(el,{
			"margin-top":"-20px"
		}, 400).then(() => {
			return canStacheAnimate.makeAnimationPromiseJQuery(el,{
				"margin-top":"0px"
			}, 400).then(() => {
				$(el).css({
					"margin-top":""
				});
			});
		});
	},

	dip2: function(vm,el,ev){
		return canStacheAnimate.makeAnimationPromiseJQuery(el,{
			"margin-top":"20px"
		}, 2000).then(() => {
			return canStacheAnimate.makeAnimationPromiseJQuery(el,{
				"margin-top":"0px"
			}, 2000).then(() => {
				$(el).css({
					"margin-top":""
				});
			});
		});
	},

	//hop3 & dip3 use jQuery's $.fn.animate().promise()
	hop3:{
		before: function(vm, el, ev){
			return $(el).animate({
				"margin-top":"-20px"
			}, 400).promise();
		},
		run: function(vm,el,ev){
			return $(el).animate({
				"margin-top":"0px"
			}, 400).promise();
		}
	},

	dip3:{
    before: function(vm, el, ev){
      return $(el).animate({
          "margin-top":"20px"
      }, 2000).promise();
    },
    run: function(vm,el,ev){
        console.log('c');
        return $(el).animate({
            "margin-top":"0px"
        }, 2000).promise();
    }
	}
});

export default canStacheAnimate;