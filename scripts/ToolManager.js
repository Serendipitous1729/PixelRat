class ToolManager {
    constructor(config) {
        this.tools = config;

        this.selectedTool = this.tools[0];

        this.documentRef = window.document;
        this.toolbarRef = window.document.getElementById("tools-container");
        this.settingsContainerRef = window.document.getElementById("settings");

        this.createHTML();
    }

    createHTML() {
        for (let tool of this.tools) {
            // toolbar button
            tool.toolButton = this.documentRef.createElement("button");
            tool.toolButton.classList.add("tool-icon");
            tool.toolButton.addEventListener("click", () => {   // WHEN A TOOL IS SELECTED - EVENT LISTENER
                this.whenToolSelected(tool);
            });
            tool.toolButton.innerHTML = `<img src="icons/${tool.icon}" alt="${tool.name}">`;
            this.toolbarRef.append(tool.toolButton);

            // tools panel
            tool.panelHTMLElements = [];
            tool.inputHTMLElements = [];

            tool.panelHTMLElements[0] = this.documentRef.createElement("h4");   // heading
            tool.panelHTMLElements[0].classList.add("subheading");
            tool.panelHTMLElements[0].innerText = `${tool.name} Settings`;

            tool.panelHTMLElements[1] = this.documentRef.createElement("br");   // first <br/>

            for (let i = 0; i < tool.inputs.length; i++) {
                let input = tool.inputs[i];

                if (input.type == "gap") {
                    tool.panelHTMLElements.push(this.documentRef.createElement("br"));  // other <br/>s

                    // delete "gap"s from the input array, since theyre not really input elements
                    tool.inputs.splice(i, 1);
                    i--;
                } else {
                    // for genuine <input> elements
                    this.initializeInputElementHTML(input, tool);
                }
            }

            if (tool == this.selectedTool) {
                this.whenToolSelected(tool);
            }
        }
    }

    initializeInputElementHTML(input, tool) {

        const invalidAttributes = ["label"]; // usually all the properties of tool.inputs are valid attributes for the <input> element, except the ones listed here

        let inputDiv = this.documentRef.createElement("div");   // input element and label container div
        inputDiv.classList.add("setting-field");

        let inputElement = this.documentRef.createElement("input"); // input element
        input._elem = inputElement;

        for (let key in input) { // attributes of input element, like type
            if (!invalidAttributes.includes(key)) {
                inputElement.setAttribute(key, input[key]);
            }
        }
        this.syncInputObjValueWithInputElementValue(input); // remember this renames input.value to input._defaultValue
        // SO ONLY CALL IT AFTER YOU'VE FINISHED SETTING ATTRIBUTES OF inputElement!!!

        // input label
        let span = this.documentRef.createElement("span");
        span.innerText = input.label;
        inputDiv.append(span);

        // for file inputs
        if (input.type == "file") {
            console.log("e");
            inputDiv.setAttribute("style", "text-align: center");

            let a = document.createElement("a");
            a.addEventListener("click", () => {
                inputElement.click();
            });

            a.innerText = "Upload file";
            inputElement.addEventListener("input", () => {
                a.innerText = `File uploaded: ${(inputElement.value) ? (inputElement.value.split("\\").pop()) : '[none]'}`;
            });

            if (input.accept != undefined) {
                inputElement.setAttribute("accept", input.accept);
            }

            inputDiv.append(a);
        }

        this.setupChangeListenersForInputElemValue(input);

        // for checkboxes
        if (input.type == "checkbox") {

            inputElement.checked = (input._defaultValue == 'true') ? true : false; // default value
            
            inputElement.addEventListener("input", () => {
                input.value = inputElement.checked;
            });

            // when the .value is changed by JS (it can't be changed by the user), the .checked should match it
            // normally this would fire when the user clicked the checkbox, which led to the change listener being fired
            // however clicking the checkbox doesnt change the 'value', so it would set the checked attribute to the old 'value'
            // which led to the checkbox not changing at all
            // so we have to ignore those events
            input.addChangeListener((newVal) => { // doesn't fire when the user clicks on the checkbox, since value doesn't change
                // set .checked to .value (the new value, since .value hasn't been set yet)
                inputElement.checked = newVal;
            });
        }


        inputDiv.append(inputElement);

        if(input.type === "range") {
            // show the range value
            let rangeValue = this.documentRef.createElement("span");
            rangeValue.classList.add("range-value-display");
            rangeValue.innerText = input._defaultValue;
            input.addChangeListener((newVal) => {
                rangeValue.innerText = newVal;
            });
            inputDiv.append(rangeValue);
        }

        tool.panelHTMLElements.push(inputDiv);
        tool.inputHTMLElements.push(inputElement);

    }

    whenToolSelected(tool) {

        for (let othertool of this.tools) {
            if (othertool.toolButton != undefined) {    // if other tools' button HTML elements haven't been generated yet
                othertool.toolButton.classList.remove("selected");
            }
        }
        tool.toolButton.classList.add("selected");

        this.settingsContainerRef.innerHTML = "";
        for (let element of tool.panelHTMLElements) {
            this.settingsContainerRef.append(element);
        }

        this.selectedTool = tool;
    }

    setupChangeListenersForInputElemValue(input) {
        // NOT LAZY getter - fires every time the value of the actual DOM element changes

        input._pValue = input._defaultValue; // the previous value, to check if the value actually changed

        let inputElement = input._elem;

        input._valueChangeListeners = [];
        input.addChangeListener = function (callback, config) {
            // callback - a callback function for when a change is detected
            // config - specify whether to fire when the user changes the value of the input, or JS changes it, or both, or neither
            /*
            exampleConfig = {
                scriptChange: true,
                userChange: false
            }
            */

            let fireOn = config || {}
            fireOn.scriptChange = !(fireOn.scriptChange == false); // it is FALSE only if it is EXACTLY false, and TRUE if it is undefined/true
            fireOn.userChange = !(fireOn.userChange == false);
            let listenerObj = {
                callback: callback,
                fireOn: fireOn
            }
            input._valueChangeListeners.push(listenerObj);
            return listenerObj;
        }
        input.removeChangeListener = function (listenerObj) {
            input._valueChangeListeners.splice(input._valueChangeListeners.indexOf(listenerObj), 1);
        }

        // intercept any changes (MADE BY SCRIPT) to the value of inputElement
        // https://stackoverflow.com/a/55033939
        const { get, set } = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        Object.defineProperty(inputElement, 'value', {
            get() {
                return get.call(this);
            },
            set(newVal) {
                input._valueChangeListeners.forEach((listenerObj) => {
                    if (listenerObj.fireOn.scriptChange) listenerObj.callback(newVal);
                });
                input._pValue = newVal;
                return set.call(this, newVal);
            }
        });

        // detect changes made by user
        inputElement.addEventListener("input", () => {
            // make sure to check for undefined, since if value is not explicitly set in config object
            // it tries to toString() undefined and then throws error and doesnt call listeners
            if (input._pValue == undefined || input._pValue.toString() !== input.value.toString()) { // has the value actually changed? or not (like in a checkbox where .checked changes instead)
                input._valueChangeListeners.forEach((listenerObj) => {
                    if (listenerObj.fireOn.userChange) listenerObj.callback(inputElement.value);
                });
                input._pValue = input.value;
            }
        })
    }

    syncInputObjValueWithInputElementValue(input) {
        // LAZY getter - calculates the updated value only when it is needed

        // now when the value property of this.tools[any].inputs[any]
        // is accessed, it returns the value in the element's html
        // and when it is set, the actual element's value is set
        // basically a getter and setter is added

        input._defaultValue = input.value;
        Object.defineProperty(input, "value", {
            get() {
                return this._elem.value;
            },
            set(v) {
                this._elem.value = v;
            }
        });


    }

    // search this.tools by tool.name
    getTool(toolName) {
        for (let tool of this.tools) {
            if (tool.name.toLowerCase() == toolName.toLowerCase()) {
                return tool;
            }
        }
    }
}