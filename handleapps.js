var wavicle = wavicle || {};
wavicle.handleapps = {};

/** The Helper companion object **/
(function() {
	
var APPS_BY_ID = {};

function putApplication(app) {
	APPS_BY_ID[app.id] = app;
}

function getApplicationById(id) {
	return APPS_BY_ID[id];
}

wavicle.handleapps.Helper = {
	getApplicationById: getApplicationById,
	putApplication: putApplication
};	
	
})();

/** The Application class **/
(function() {
	
function Application($rootElement, id) {
	var me = this;
	me.id = id || (new Date().getTime() + "-" + Math.random());

	var currentStateName;
	var exposedProperties = [];
	var outerTemplateString = $rootElement.find(".happs_outer").html();
	var outerTemplate = outerTemplateString? Handlebars.compile(outerTemplateString): null;
	var $outputContainer = $rootElement.find(".happs_output");
	
	var entryHandlersByStateName = {};
	var exitHandlersByStateName = {};
	var bodyTemplatesByStateName = {};
	
	function createHandlerFunction(body) {
		var exposeScript = '';
		for(var i in exposedProperties) {
			const exposedProperty = exposedProperties[i];
			exposeScript += `const ${exposedProperty} = this['${exposedProperty}'];`;
		}
		if(body) {
			return new Function(`
			${exposeScript}
			${body}
			`);
		}
	}

	function runState(stateName) {
		if (!bodyTemplatesByStateName[stateName]) {
			throw "No such state is known: " + stateName;
		}
		var doExitPrevious = runExitScript();
		if (doExitPrevious) {
			currentStateName = stateName;
			runEntryScript();
			renderStateBody();
		}
	}
	
	function runExitScript() {
		$outputContainer.find("input,select").each(function() {
			var inputName = $(this).attr("name");
			var inputVal = $(this).val();
			me.data[inputName] = inputVal;
		});
		if (currentStateName) {
			var exitHandler = exitHandlersByStateName[currentStateName];
			if (exitHandler) {
				return exitHandler.apply(me);
			}
		}
		return true;
	}
	
	function runEntryScript() {
		if (currentStateName) {
			var entryHandler = entryHandlersByStateName[currentStateName];
			if (entryHandler) {
				entryHandler.apply(me);
			}
		}
	}
	
	function renderStateBody() {
		var finalBody;
		var template = bodyTemplatesByStateName[currentStateName]
		if (template) {
			innerBody = template(me);
			if (outerTemplate) {
				me._innerBody = innerBody;
				finalBody = outerTemplate(me);
			} else {
				finalBody = innerBody;
			}
			$outputContainer.html(finalBody);
		}
	}
	
	function start(startStateName) {
		var $states = $rootElement.find(".happs_state");
		$states.each(function() {
			var $state = $(this);
			var stateName = $state.attr('id');
			
			entryHandlersByStateName[stateName] = createHandlerFunction(
				$state.find("script[type='happs_entry']").html());
			exitHandlersByStateName[stateName] = createHandlerFunction(
				$state.find("script[type='happs_exit'").html());
			
			var $body = $state.clone();
			$body.find("script").remove();
			var bodyTemplate = $body.html();
			var template = bodyTemplate? Handlebars.compile(bodyTemplate): null;
			bodyTemplatesByStateName[stateName] = template;
		})
		runState(startStateName);
	}
	
	function visit(stateName) {
		runState(stateName);
	}
	
	wavicle.handleapps.Helper.putApplication(me);
	this.data = {};
	this.start = start;
	this.visit = visit;
	this.expose = function(properties) {
		exposedProperties = properties || [];
	};
	this.getId = function() {
		return id;
	};
}

wavicle.handleapps.Application = Application;
	
})();

/** Some Handlebars helpers **/
(function() {
	
Handlebars.registerHelper('visit', function(stateName) {
    return new Handlebars.SafeString(
		`wavicle.handleapps.Helper.getApplicationById('${this.id}').visit('${stateName}');`);
});

Handlebars.registerHelper('innerBody', function(stateName) {
    return new Handlebars.SafeString(this._innerBody);
});
	
})();