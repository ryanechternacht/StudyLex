exports.handler = function(event, context) {
    var _ = require("lodash");

    var template = _.template("applicationId: <%- appId %> || requestId: <%- reqId %> || sessionId: <%- sessId %>");
    console.log(template({ 
        appId: event && event.session && event.session.application && event.session.application.applicationId,
        reqId: event && event.request && event.request.requestId,
        sessId: event && event.session && event.session.sessionId
    }));

    // probably a better way to handle this
    event.session.attributes = event.session.attributes || {};

    if (event.session.new) {
    }

    if(event.request.type === "LaunchRequest") {
        //TODO refactor into promise
        handleLaunchRequest(event, context);
    } else if(event.request.type === "IntentRequest") {
        //TODO refactor into promise
        handleIntentRequest(event, context);
    }

    function handleIntentRequest(event, context) {
        console.log("intent request");
        console.log(event);
        var intent = event.request.intent,
            intentName = intent.name,
            attributes = event.session.attributes,
            responses = loadResponses(attributes.userData, attributes.appState),
            fsm = buildFsm(responses, attributes.fsmState),
            response = responses.buildResponse();

        if(intentName === "AMAZON.NextIntent") {
            fsm.next(response);
        } else if(intentName === "AMAZON.HelpIntent") {
            fsm.help(response);
        } else if(intentName === "AMAZON.RepeatIntent") {
            fsm.repeat(response);
        } else if(intentName === "AMAZON.StopIntent") {
            fsm.stop(response);
        } else if(intentName === "AMAZON.YesIntent") {
            fsm.yes(response);
        } else if(intentName === "AMAZON.NoIntent") {
            fsm.no(response);
        } else if(intentName == "MoreInformation") {
            fsm.moreInformation(response);
        } else {
            context.fail("Unknown intent");
        }

        attributes.fsmState = fsm.state;
        attributes.appState.currentStep = responses.getCurrentStep();
        attributes.appState.currentMoreInformationLevel = responses.getCurrentMoreInformationLevel();

        var alexaResponse = buildAlexaResponse(event, response);
        context.succeed(alexaResponse);
    }

    function handleLaunchRequest(event, context) {
        var attributes = event.session.attributes;
        console.log("handle launch");

        loadUserData(attributes.userData).then(ud => {
            console.log("promise resolved");
            attributes.userData = ud;
            attributes.appState = {
                currentStep: 0,
                currentMoreInformationLevel: 0
            };
            var responses = loadResponses(
                attributes.userData, attributes.appState); 
            var fsm = buildFsm(responses);

            var response = responses.buildResponse();
            fsm.start(response);
            attributes.fsmState = fsm.state;
            attributes.appState.currentStep = responses.getCurrentStep();
            attributes.appState.currentMoreInformationLevel = 
            responses.getCurrentMoreInformationLevel();

            console.log(attributes);
            var alexaResponse = buildAlexaResponse(event, response);
            context.succeed(alexaResponse);
        }, obj => {
            console.log("it failed", obj);
        }).catch(err => {
            context.fail(err);
        });
    }

    function buildAlexaResponse(event, response) {
        var msg = _.join(response.message, " "),
            template = _.template("<speak><%- msg %></speak>"),
            output = template({msg: msg});

        return {
            version: "1.0",
            sessionAttributes: event.session.attributes,
            response: {
                outputSpeech: {
                    type: "SSML",
                    ssml: output
                },
                // card?
                reprompt: {
                    outputSpeech: {
                        type: "SSML",
                        ssml: output
                    }
                },
                shouldEndSession: response.shouldEnd
            },
        };
    }

    function loadResponses(userData, currentStep) {
        return obj = require('./responses.js')(userData, currentStep);
    }

    function loadUserData(userData) {
        if(userData) {
            return new Promise(function(resolve, reject) {
                resolve(userData);
            });
        } else {
            var fs = require('fs');
            // var obj = JSON.parse(fs.readFileSync('user-input.json', 'utf8'));
            
            // return obj;
            return new Promise(function(resolve, reject) {
                resolve(JSON.parse(fs.readFileSync('user-input.json')));
            });
            // return new Promise(function(resolve, reject) {
            //     var http = require('http');
            //     http.get('http://elevate8.azurewebsites.net/flashcards/cards', response => {
            //         console.log("response");
            //         var data = "";

            //         response.on('data', function(chunk) {
            //             // console.log("chunk", chunk);
            //             data += chunk;
            //         });

            //         response.on('end', function() {
            //             console.log(data);
            //             resolve({
            //                 questions: JSON.parse(data),
            //                 appName: "elevate"
            //             });
            //         });
                    
            //         response.on('error', function(ex) {
            //             reject(ex);
            //         });
            //     });
            // });
        }        
    }

    function buildFsm(responses, initialState) {
        try {
            var fsmGenerator = require('./fsm.js'),
                fsm = fsmGenerator(initialState);

            fsm.on("transition", function(data) {
            });

            fsm.on("welcome", function(response) {
                responses.handleWelcome(response);
            });

            fsm.on("step", function(response) {
                responses.handleStep(response);
            });

            fsm.on("nextStep", function(response) {
                responses.handleNextStep(response);
            });

            fsm.on("repeatStep", function(response) {
                responses.handleRepeatStep(response);
            });

            fsm.on("moreInformation", function(response) {
                responses.handleMoreInformation(response);
            });

            fsm.on("help", function(response) {
                responses.handleHelp(response);
            })

            fsm.on("stop", function(response) {
                responses.handleStop(response);
            });

            return fsm;
        } catch(ex) {
            console.log(ex.stack);
        }
    }
};