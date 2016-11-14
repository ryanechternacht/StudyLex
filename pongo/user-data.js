module.exports = {
    states: [
        {
            name: "initialState",
            transitions: [
                { 
                    kind: "standard", 
                    intent: "AMAZON.NoIntent",
                    state: "no"
                },
                { 
                    kind: "standard", 
                    intent: "AMAZON.YesIntent",
                    state: "yes"
                },
            ],
            message: "this is the initial state"
        },
        {
            name: "yes",
            message: "you said yes"
        },
        {
            name: "no",
            message: "you said no"
        }
    ],
    intents: [
        "AMAZON.NoIntent", 
        "AMAZON.YesIntent"
    ]
};