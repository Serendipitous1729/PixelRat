// EventManager.js HelperLib by serendipitous19
// v1.0.0

// NOTE: Designed only for handling inputs for the <canvas/> element
class EventManager {
    constructor(target) {
        this.targetElement = target;

        this.keys = {};
        this.mouse = {
            get left() {
                return this[0];
            },
            get middle() {
                return this[1];
            },
            get right() {
                return this[2];
            },
            pos: new Vector2(0, 0),
            prev: new Vector2(0, 0),
            get x() {
                return this.pos.x
            },
            get y() {
                return this.pos.y
            }
        }

        const documentListeners = ["keydown", "keyup"];
        const targetListeners = ["mousedown", "mouseup", "mousemove", "click"];

        this.eventListeners = {
            keydown: [],
            keyup: []
        }

        for (let event of documentListeners) {
            this.eventListeners[event] = { target: document, callbackQueue: [] };
        }
        for (let event of targetListeners) {
            this.eventListeners[event] = { target: target, callbackQueue: [] };
        }

        for (let event in this.eventListeners) {
            this.eventListeners[event].target.addEventListener(event, (e) => {
                for (let callback of this.eventListeners[event].callbackQueue) {
                    callback(e);
                }
            });
        }

        this.addEventListener("keydown", (e) => {
            this.keys[e.key] = true;
        });
        this.addEventListener("keyup", (e) => {
            this.keys[e.key] = false;
        });

        this.addEventListener("mousedown", (e) => {
            this.mouse[e.button] = true;
        });
        this.addEventListener("mouseup", (e) => {
            this.mouse[e.button] = false;
        });
        this.addEventListener("mousemove", (e) => {
            this.mouse.prev.set(this.mouse.pos);
            this.mouse.pos.set(e.offsetX, e.offsetY);
        });
    }

    addEventListener(event, callback) {
        if (this.eventListeners[event] == undefined) {
            console.warn(`EventManager: The ${event} event is not supported by EventManager`);
        }
        this.eventListeners[event].callbackQueue.push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners[event] == undefined) {
            console.warn(`EventManager: The ${event} event is not supported by EventManager`);
        }
        let index = this.eventListeners[event].callbackQueue.indexOf(callback);
        if (index == -1) {
            console.warn("EventManager: The callback function of the listener to be removed from EventManager was not found")
        } else {
            this.eventListeners[event].splice(index, 1);
        }
    }
}