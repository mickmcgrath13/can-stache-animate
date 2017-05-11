import $ from 'jquery';
import canStacheAnimate from 'can-stache-animate';

canStacheAnimate.registerAnimations({
	customFadeIn:{
		before:function(vm, el, ev){
			vm.dispatch("customfadeinbefore", [{test: "foo"}]);
			$(el).css({
				"display": "none",
				"opacity": 0
			})
		},
		run:function(vm, el, ev){
			vm.dispatch("customfadeinrunning", [{test: "foo"}]);
			$(el).show().animate({
				"opacity": 1
			})
		},
		after: function(vm, el, ev){
			$(el).css({
				"display": "",
				"opacity": ""
			});
			vm.dispatch("customfadeincomplete", [{test: "foo"}]);
		}
	}
});

export default canStacheAnimate;