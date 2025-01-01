const canvasSizer = document.getElementById("canvas-sizer");
const canvas = document.getElementById("canvas");

const ctx = canvas.getContext("2d");

function resizeCanvas(canvas, canvasSizer) {
    canvas.width = canvasSizer.clientWidth;
    canvas.height = canvasSizer.clientHeight - 24; // to compensate for the div above it;
}

const eventManager = new EventManager(canvas);
const toolsConfig = [
    {
        name: "Project",
        icon: "gear.svg",
        inputs: [
            {
                label: "load project",
                type: "file",
                accept: "application/json"
            },
            {
                type: "gap"
            },
            {
                label: "pixel size",
                type: "number",
                value: 10
            },
            {
                type: "gap"
            },
            {
                label: "project width",
                type: "number",
                value: 100
            },
            {
                label: "project height",
                type: "number",
                value: 100
            },
            { type: "gap" },
            {
                label: "(ctrl + z)",
                type: "button",
                value: "undo"
            },
            {
                label: "(ctrl + y)",
                type: "button",
                value: "redo"
            }
        ]
    },
    {
        name: "Viewport",
        icon: "display.svg",
        inputs: [
            {
                label: "center viewport",
                type: "checkbox",
                value: "true"
            },
            {
                label: "zoom to fit",
                type: "checkbox",
                value: "true"
            },
            {
                label: "reset zoom",
                type: "button",
                value: "reset"
            },
            {
                type: "gap"
            },
            {
                label: "viewport pan x",
                type: "number"
            },
            {
                label: "viewport pan y",
                type: "number"
            },
            {
                type: "gap"
            },
            {
                label: "viewport zoom",
                type: "number",
                step: 0.01
            },
            {
                type: "gap"
            },
            {
                label: "transparency color 1",
                type: "color",
                value: "#ffffff"
            },
            {
                label: "transparency color 2",
                type: "color",
                value: "#d9d9d9"
            }
        ]
    },
    {
        name: "Layer",
        icon: "layers.svg",
        inputs: [
            {
                label: "name",
                type: "text",
                value: "background"
            },
            { type: "gap" },
            {
                label: "layer opacity",
                type: "range",
                value: 1,
                min: 0,
                max: 1,
                step: 0.01
            }
        ],
        layerChangeListener: function (drawingArea, newLayerIndex, self) {
            self.inputs[0].value = drawingArea.layers[newLayerIndex].name;
            self.inputs[1].value = drawingArea.layers[newLayerIndex].opacity;
        }
    },
    {
        name: "Pen",
        icon: "pencil.svg",
        inputs: [
            {
                label: "color",
                type: "color",
                value: "#000000"
            },
            {
                label: "opacity",
                type: "range",
                value: 1,
                min: 0,
                max: 1,
                step: 0.01
            },
            {
                type: "gap"
            },
            {
                label: "size",
                type: "number",
                value: 1
            }
        ],
        isPixelHighlighted: function (drawingArea, pixelIndex, self) {
            let { indicesOfHoveredOverPixel } = drawingArea;
            let { x, y } = pixelIndex;
            let lowerBound = Math.floor((self.inputs[2].value - 1) / 2);
            let upperBound = Math.ceil((self.inputs[2].value - 1) / 2);
            if (
                indicesOfHoveredOverPixel.x - lowerBound <= x &&
                x <= indicesOfHoveredOverPixel.x + upperBound &&
                indicesOfHoveredOverPixel.y - lowerBound <= y &&
                y <= indicesOfHoveredOverPixel.y + upperBound
            ) {
                return true;
            }
            return false;
        },
        forEachPixel: function (drawingArea, layerIndex, pixelIndex, self) {

            // TODO: fix this bug:
            // BUG: for certain window sizes, e.g. when console is open such that it is 1088px*612px
            //      lines drawn still have random gaps in them??? why???
            //      cursor has to be moved at a moderate speed
            //      on a maximised window with no console on 90% zoom this does not occur???
            //      UPDATE: it seems like this is independent of window size and only happens when the console is open!??!?
            //      HEH??????????


            let { input, activeLayerIndex, activeLayer, parseHexOpacityIntoColorArray, getPixelIndicesFromScreenspaceCoordinates } = drawingArea; // for some reason if you need the thing to be called with the 'this' context as drawingArea, you cannot import like this
            let { x, y } = pixelIndex;

            if (input.mouse.left && layerIndex == activeLayerIndex) {
                let start = input.mouse.prev.get();
                let end = input.mouse.pos.get();
                let delta = input.mouse.pos.get().sub(start);
                let stepSize = Vector2.Normalize(delta).mult(drawingArea.zoomedPixelSize);
                let numSteps = delta.mag / drawingArea.zoomedPixelSize;

                let lowerBound = Math.floor((self.inputs[2].value - 1) / 2);
                let upperBound = Math.ceil((self.inputs[2].value - 1) / 2);

                for (let i = 0; i <= numSteps; i++) {
                    let indices = drawingArea.getPixelIndicesFromScreenspaceCoordinates(start.x, start.y);
                    if (i == numSteps) indices = drawingArea.getPixelIndicesFromScreenspaceCoordinates(end.x, end.y)
                    if (
                        indices.x - lowerBound <= x &&
                        x <= indices.x + upperBound &&
                        indices.y - lowerBound <= y &&
                        y <= indices.y + upperBound
                    ) {
                        // we are within `size` of the line!
                        activeLayer.data[pixelIndex.x][pixelIndex.y] = parseHexOpacityIntoColorArray(self.inputs[0].value, self.inputs[1].value);
                        break;
                    }
                    start.add(stepSize);
                }
            }
        },
        eventListeners: {
            mousedown: function (drawingArea, e, self) {
                if (drawingArea.activeLayer.isIndexValid(drawingArea.indicesOfHoveredOverPixel.x, drawingArea.indicesOfHoveredOverPixel.y)) {
                    drawingArea.pushToUndoStack();
                }
            }
        }
    },
    {
        name: "Eraser",
        icon: "eraser.svg",
        inputs: [
            {
                label: "size",
                type: "number",
                value: 1
            }
        ],
        isPixelHighlighted: function (drawingArea, pixelIndex, self) {
            let { indicesOfHoveredOverPixel } = drawingArea;
            let { x, y } = pixelIndex;
            let lowerBound = Math.floor((self.inputs[0].value - 1) / 2);
            let upperBound = Math.ceil((self.inputs[0].value - 1) / 2);
            if (
                indicesOfHoveredOverPixel.x - lowerBound <= x &&
                x <= indicesOfHoveredOverPixel.x + upperBound &&
                indicesOfHoveredOverPixel.y - lowerBound <= y &&
                y <= indicesOfHoveredOverPixel.y + upperBound
            ) {
                return true;
            }
            return false;
        },
        forEachPixel: function (drawingArea, layerIndex, pixelIndex, self) {
            let { input, activeLayerIndex, activeLayer, parseHexOpacityIntoColorArray, getPixelIndicesFromScreenspaceCoordinates } = drawingArea; // for some reason if you need the thing to be called with the 'this' context as drawingArea, you cannot import like this
            let { x, y } = pixelIndex;

            if (input.mouse.left && layerIndex == activeLayerIndex) {
                let start = input.mouse.prev.get();
                let end = input.mouse.pos.get();
                let delta = input.mouse.pos.get().sub(start);
                let stepSize = Vector2.Normalize(delta).mult(drawingArea.zoomedPixelSize);
                let numSteps = delta.mag / drawingArea.zoomedPixelSize;

                let lowerBound = Math.floor((self.inputs[0].value - 1) / 2);
                let upperBound = Math.ceil((self.inputs[0].value - 1) / 2);

                for (let i = 0; i <= numSteps; i++) {
                    let indices = drawingArea.getPixelIndicesFromScreenspaceCoordinates(start.x, start.y);
                    if (i == numSteps) indices = drawingArea.getPixelIndicesFromScreenspaceCoordinates(end.x, end.y)
                    if (
                        indices.x - lowerBound <= x &&
                        x <= indices.x + upperBound &&
                        indices.y - lowerBound <= y &&
                        y <= indices.y + upperBound
                    ) {
                        // we are within `size` of the line!
                        activeLayer.data[pixelIndex.x][pixelIndex.y] = [0, 0, 0, 0];
                        break;
                    }
                    start.add(stepSize);
                }
            }
        },
        eventListeners: {
            mousedown: function (drawingArea, e, self) {
                if (drawingArea.activeLayer.isIndexValid(drawingArea.indicesOfHoveredOverPixel.x, drawingArea.indicesOfHoveredOverPixel.y)) {
                    drawingArea.pushToUndoStack();
                }
            }
        }
    },
    {
        name: "Fill Bucket",
        icon: "paint-bucket.svg",
        inputs: [
            {
                label: "color",
                type: "color",
                value: "rgba(0, 0, 0, 0)"
            },
            {
                label: "opacity",
                type: "range",
                value: 1,
                min: 0,
                max: 1,
                step: 0.01
            },
            {
                type: "gap"
            },
            {
                label: "8-neighbour",
                type: "checkbox",
                value: "false"
            }
        ],
        eventListeners: {
            mousedown: function (drawingArea, e, self) {
                if (!drawingArea.input.mouse.left) { // only on left click
                    return
                }

                let clickedPixel = drawingArea.indicesOfHoveredOverPixel;
                if (!drawingArea.activeLayer.isIndexValid(clickedPixel.x, clickedPixel.y)) {
                    return; // clicked off the drawing area
                }

                drawingArea.pushToUndoStack();
                let oldColor = drawingArea.activeLayer.data[clickedPixel.x][clickedPixel.y];
                let newColor = drawingArea.parseHexOpacityIntoColorArray(self.inputs[0].value, self.inputs[1].value);
                let oldColorString = oldColor.join("");

                let toBeFilled = [clickedPixel]; // queue
                if (oldColorString != newColor.join("")) {
                    while (toBeFilled.length > 0) {
                        let currentPixelCoords = toBeFilled.shift();
                        if (drawingArea.activeLayer.isIndexValid(currentPixelCoords.x, currentPixelCoords.y) && drawingArea.activeLayer.data[currentPixelCoords.x][currentPixelCoords.y].join("") === oldColorString) {
                            drawingArea.activeLayer.set(currentPixelCoords.x, currentPixelCoords.y, newColor);

                            toBeFilled.push({ x: currentPixelCoords.x - 1, y: currentPixelCoords.y });
                            toBeFilled.push({ x: currentPixelCoords.x, y: currentPixelCoords.y - 1 });
                            toBeFilled.push({ x: currentPixelCoords.x + 1, y: currentPixelCoords.y });
                            toBeFilled.push({ x: currentPixelCoords.x, y: currentPixelCoords.y + 1 });

                            if (self.inputs[2].value == "true") {
                                toBeFilled.push({ x: currentPixelCoords.x - 1, y: currentPixelCoords.y - 1 });
                                toBeFilled.push({ x: currentPixelCoords.x + 1, y: currentPixelCoords.y - 1 });
                                toBeFilled.push({ x: currentPixelCoords.x + 1, y: currentPixelCoords.y + 1 });
                                toBeFilled.push({ x: currentPixelCoords.x - 1, y: currentPixelCoords.y + 1 });
                            }
                        }
                    }
                }

            }
        }
    },
    {
        name: "Line Tool",
        icon: "slash-lg.svg",
        inputs: [
            {
                label: "color",
                type: "color",
                value: "rgba(0, 0, 0, 0)"
            },
            {
                label: "opacity",
                type: "range",
                value: 1,
                min: 0,
                max: 1,
                step: 0.01
            },
            {
                type: "gap"
            },
            {
                label: "line width",
                type: "number",
                value: 1
            },
            {
                type: "gap"
            },
            {
                label: "constant slope",
                type: "checkbox",
                value: "false"
            }
        ],
        isPixelHighlighted: function (drawingArea, pixelIndex, self) {
            let { indicesOfHoveredOverPixel } = drawingArea;
            let { x, y } = pixelIndex;
            if (Math.hypot(x - indicesOfHoveredOverPixel.x, y - indicesOfHoveredOverPixel.y) <= self.inputs[2].value / 2) {
                return true;
            }
            return false;
        },
        eventListeners: {
            mousedown: function (drawingArea, e, self) {
                if (drawingArea.input.mouse.left) {
                    self._lineStartIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);
                    drawingArea.pushToUndoStack();
                }
            },
            mousemove: function (drawingArea, e, self) {
                if (self._lineStartIndices === null) {
                    return;
                }

                drawingArea.clearOverlay();

                let lineEndIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);

                if (self.inputs[3].value == "true") {
                    let lineVector = Vector2.Sub(lineEndIndices, self._lineStartIndices);
                    // slope must have either a numerator or denominator of 1 in simplest form
                    // since bresnham always steps by 1 pixel along one axis
                    if (lineVector.x !== 0 && lineVector.y !== 0) { // otherwise division by 0 and line isnt drawn
                        if (Math.abs(lineVector.x) > Math.abs(lineVector.y)) {
                            // make sure slope is 1/integer
                            let inverseSlope = Math.round(lineVector.x / lineVector.y);
                            lineVector.set(lineVector.y * inverseSlope, lineVector.y);
                            lineEndIndices = Vector2.Add(lineVector, self._lineStartIndices);
                        } else if (Math.abs(lineVector.x) < Math.abs(lineVector.y)) {
                            let slope = Math.round(lineVector.y / lineVector.x);
                            lineVector.set(lineVector.x, lineVector.x * slope);
                            lineEndIndices = Vector2.Add(lineVector, self._lineStartIndices);
                        }
                    }
                }

                let lineIndicesArray = drawingArea.bresnham(self._lineStartIndices, lineEndIndices);
                let color = drawingArea.parseHexOpacityIntoColorArray(self.inputs[0].value, self.inputs[1].value);
                lineIndicesArray.forEach((pointOnLine) => {
                    let filledCircle = drawingArea.filledCircle(pointOnLine, parseInt(self.inputs[2].value) / 4);
                    filledCircle.forEach((pointInCircle) => {
                        if (drawingArea.overlay.isIndexValid(pointInCircle.x, pointInCircle.y) && drawingArea.overlay.data[pointInCircle.x][pointInCircle.y].join("") == "0000") {
                            drawingArea.overlay.set(pointInCircle.x, pointInCircle.y, color);
                        }
                    });
                });
            },
            mouseup: function (drawingArea, e, self) {
                if (self._lineStartIndices === null)
                    return;

                drawingArea.clearOverlay();

                let lineEndIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);
                if (self.inputs[3].value == "true") {
                    let lineVector = Vector2.Sub(lineEndIndices, self._lineStartIndices);
                    // slope must have either a numerator or denominator of 1 in simplest form
                    // since bresnham always steps by 1 pixel along one axis
                    if (lineVector.x !== 0 && lineVector.y !== 0) { // otherwise division by 0 and line isnt drawn
                        if (Math.abs(lineVector.x) > Math.abs(lineVector.y)) {
                            // make sure slope is 1/integer
                            let inverseSlope = Math.round(lineVector.x / lineVector.y);
                            lineVector.set(lineVector.y * inverseSlope, lineVector.y);
                            lineEndIndices = Vector2.Add(lineVector, self._lineStartIndices);
                        } else if (Math.abs(lineVector.x) < Math.abs(lineVector.y)) {
                            let slope = Math.round(lineVector.y / lineVector.x);
                            lineVector.set(lineVector.x, lineVector.x * slope);
                            lineEndIndices = Vector2.Add(lineVector, self._lineStartIndices);
                        }
                    }
                }

                let lineIndicesArray = drawingArea.bresnham(self._lineStartIndices, lineEndIndices);

                lineIndicesArray.forEach((pointOnLine) => {
                    let filledCircle = drawingArea.filledCircle(pointOnLine, parseInt(self.inputs[2].value) / 4);
                    filledCircle.forEach((pointInCircle) => {
                        drawingArea.activeLayer.set(pointInCircle.x, pointInCircle.y, drawingArea.parseHexOpacityIntoColorArray(self.inputs[0].value, self.inputs[1].value));
                    });
                });

                if (!drawingArea.input.mouse.left)
                    self._lineStartIndices = null;
            },
        },
        _lineStartIndices: null
    },
    {
        name: "Ellipse Tool",
        icon: "circle.svg",
        inputs: [
            {
                label: "fill color",
                type: "color",
                value: "rgba(0, 0, 0, 0)"
            },
            {
                label: "fill opacity",
                type: "range",
                value: 1,
                min: 0,
                max: 1,
                step: 0.01
            },
            { type: "gap" },
            {
                label: "control ellipse's center",
                type: "checkbox",
                value: false
            },
            { type: "gap" },
            {
                label: "stroke thickness",
                type: "number",
                value: 1
            },
            { type: "gap" },
            {
                label: "circle",
                type: "checkbox",
                value: "false"
            }
        ],
        // here `circle` actually means an ellipse
        eventListeners: {
            mousedown: function (drawingArea, e, self) {
                if (drawingArea.input.mouse.left) {
                    self._circleStartIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);
                    drawingArea.pushToUndoStack();
                }
            },
            mousemove: function (drawingArea, e, self) {

                if (self._circleStartIndices === null) {
                    return;
                }

                drawingArea.clearOverlay();

                let circleEndIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);
                let circleSizeVector = Vector2.Sub(circleEndIndices, self._circleStartIndices);

                if (self.inputs[4].value === "true") {
                    circleSizeVector.set(circleSizeVector.mag * (Math.sign(circleSizeVector.x) || 1), circleSizeVector.mag * (Math.sign(circleSizeVector.y) || 1));
                }


                let circleIndicesArray = drawingArea.outlineEllipse(self._circleStartIndices, circleSizeVector, self.inputs[2].value === "true");
                let color = drawingArea.parseHexOpacityIntoColorArray(self.inputs[0].value, self.inputs[1].value);
                circleIndicesArray.forEach((pointOnOutline) => {
                    let filledCircle = drawingArea.filledCircle(pointOnOutline, Math.floor(parseInt(self.inputs[3].value) / 2));
                    if (Math.floor(parseInt(self.inputs[3].value)) < 2 && Math.floor(parseInt(self.inputs[3].value)) > 0) {
                        filledCircle = [pointOnOutline];
                    }
                    filledCircle.forEach((pointInCircle) => {
                        if (drawingArea.overlay.isIndexValid(pointInCircle.x, pointInCircle.y) && drawingArea.overlay.data[pointInCircle.x][pointInCircle.y].join("") === "0000") {
                            drawingArea.overlay.set(pointInCircle.x, pointInCircle.y, color);
                        }
                    });
                });
            },
            mouseup: function (drawingArea, e, self) {

                if (self._circleStartIndices === null) {
                    return; // idk why this happens?
                }

                drawingArea.clearOverlay();

                let circleEndIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);
                let circleSizeVector = Vector2.Sub(circleEndIndices, self._circleStartIndices);

                if (self.inputs[4].value === "true") {
                    circleSizeVector.set(circleSizeVector.mag * Math.sign(circleSizeVector.x), circleSizeVector.mag * Math.sign(circleSizeVector.y));
                }

                let circleIndicesArray = drawingArea.outlineEllipse(self._circleStartIndices, circleSizeVector, self.inputs[2].value === "true");
                let color = drawingArea.parseHexOpacityIntoColorArray(self.inputs[0].value, self.inputs[1].value);
                let colorString = color.join("");
                circleIndicesArray.forEach((pointOnOutline) => {
                    let filledCircle = drawingArea.filledCircle(pointOnOutline, Math.floor(parseInt(self.inputs[3].value) / 2));
                    if (Math.floor(parseInt(self.inputs[3].value)) < 2 && Math.floor(parseInt(self.inputs[3].value)) > 0) {
                        filledCircle = [pointOnOutline];
                    }
                    filledCircle.forEach((pointInCircle) => {
                        if (drawingArea.activeLayer.isIndexValid(pointInCircle.x, pointInCircle.y) && drawingArea.activeLayer.data[pointInCircle.x][pointInCircle.y].join("") !== colorString) {
                            drawingArea.activeLayer.set(pointInCircle.x, pointInCircle.y, color);
                        }
                    });
                });

                if (!drawingArea.input.mouse.left) {
                    self._circleStartIndices = null;
                }
            }
        },
        _circleStartIndices: null
    },
    {
        name: "Rectangle Tool",
        icon: "square.svg",
        inputs: [
            {
                label: "fill color",
                type: "color",
                value: "rgba(0, 0, 0, 0)"
            },
            {
                label: "fill opacity",
                type: "range",
                value: 1,
                min: 0,
                max: 1,
                step: 0.01
            },
            { type: "gap" },
            {
                label: "stroke thickness",
                type: "number",
                value: 1
            },
            { type: "gap" },
            {
                label: "square",
                type: "checkbox",
                value: "false"
            }
        ],
        eventListeners: {
            mousedown: function (drawingArea, e, self) {
                if (drawingArea.input.mouse.left) {
                    self._rectStartIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);
                    drawingArea.pushToUndoStack();
                }
            },
            mousemove: function (drawingArea, e, self) {
                if (self._rectStartIndices === null) {
                    return;
                }

                drawingArea.clearOverlay();

                let rectStartIndices = self._rectStartIndices;
                let rectEndIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);

                if (self.inputs[3].value === "true") {
                    let rectDiagonal = Vector2.Sub(rectEndIndices, rectStartIndices);
                    let newSideLength = Math.max(Math.abs(rectDiagonal.x), Math.abs(rectDiagonal.y))
                    rectDiagonal.set(newSideLength * (Math.sign(rectDiagonal.x) || 1), newSideLength * (Math.sign(rectDiagonal.y) || 1));
                    rectEndIndices = rectDiagonal.add(rectStartIndices);
                }

                let topLeft = rectStartIndices;
                let topRight = new Vector2(rectEndIndices.x, rectStartIndices.y);
                let bottomLeft = new Vector2(rectStartIndices.x, rectEndIndices.y);
                let bottomRight = rectEndIndices;


                let lineIndicesArray = [];
                lineIndicesArray = lineIndicesArray.concat(drawingArea.bresnham(topLeft, topRight));
                lineIndicesArray = lineIndicesArray.concat(drawingArea.bresnham(topRight, bottomRight));
                lineIndicesArray = lineIndicesArray.concat(drawingArea.bresnham(bottomRight, bottomLeft));
                lineIndicesArray = lineIndicesArray.concat(drawingArea.bresnham(bottomLeft, topLeft));

                let color = drawingArea.parseHexOpacityIntoColorArray(self.inputs[0].value, self.inputs[1].value);
                lineIndicesArray.forEach((pointOnLine) => {
                    let filledCircle = drawingArea.filledSquare(pointOnLine, parseInt(self.inputs[2].value));
                    filledCircle.forEach((pointInCircle) => {
                        if (drawingArea.overlay.isIndexValid(pointInCircle.x, pointInCircle.y) && drawingArea.overlay.data[pointInCircle.x][pointInCircle.y].join("") == "0000") { // second condition makes sure we're not setting the same pixel twice - which saves some computation??
                            drawingArea.overlay.set(pointInCircle.x, pointInCircle.y, color);
                        }
                    });
                });
            },
            mouseup: function (drawingArea, e, self) {
                if (self._rectStartIndices === null) {
                    return;
                }

                drawingArea.clearOverlay();

                let rectStartIndices = self._rectStartIndices;
                let rectEndIndices = new Vector2(drawingArea.indicesOfHoveredOverPixel);

                if (self.inputs[3].value === "true") {
                    let rectDiagonal = Vector2.Sub(rectEndIndices, rectStartIndices);
                    let newSideLength = Math.max(Math.abs(rectDiagonal.x), Math.abs(rectDiagonal.y))
                    rectDiagonal.set(newSideLength * (Math.sign(rectDiagonal.x) || 1), newSideLength * (Math.sign(rectDiagonal.y) || 1));
                    rectEndIndices = rectDiagonal.add(rectStartIndices);
                }

                let topLeft = rectStartIndices;
                let topRight = new Vector2(rectEndIndices.x, rectStartIndices.y);
                let bottomLeft = new Vector2(rectStartIndices.x, rectEndIndices.y);
                let bottomRight = rectEndIndices;


                let lineIndicesArray = [];
                lineIndicesArray = lineIndicesArray.concat(drawingArea.bresnham(topLeft, topRight));
                lineIndicesArray = lineIndicesArray.concat(drawingArea.bresnham(topRight, bottomRight));
                lineIndicesArray = lineIndicesArray.concat(drawingArea.bresnham(bottomRight, bottomLeft));
                lineIndicesArray = lineIndicesArray.concat(drawingArea.bresnham(bottomLeft, topLeft));


                let color = drawingArea.parseHexOpacityIntoColorArray(self.inputs[0].value, self.inputs[1].value);
                let colorString = color.join("");
                lineIndicesArray.forEach((pointOnLine) => {
                    let filledCircle = drawingArea.filledSquare(pointOnLine, parseInt(self.inputs[2].value));
                    filledCircle.forEach((pointInCircle) => {
                        if (drawingArea.activeLayer.isIndexValid(pointInCircle.x, pointInCircle.y) && drawingArea.activeLayer.data[pointInCircle.x][pointInCircle.y].join("") != colorString) {
                            drawingArea.activeLayer.set(pointInCircle.x, pointInCircle.y, color);
                        }
                    });
                });

                if (!drawingArea.input.mouse.left) {
                    self._rectStartIndices = null;
                }
            },
        },
        _rectStartIndices: null
    }
];
const toolManager = new ToolManager(toolsConfig);
const layerManager = new LayerManager();
const Pixelrat = new DrawingArea(ctx, eventManager, toolManager, layerManager);

let t = 0;
function update() {
    t++;
    resizeCanvas(canvas, canvasSizer);
    // update values


    // for each layer
    // draw layers
    ctx.imageSmoothingEnabled = false; // turns off antialiasing?
    Pixelrat.render();
    window.requestAnimationFrame(update);

}

window.requestAnimationFrame(update);

document.getElementById("export-png").addEventListener("click", () => {
    Pixelrat.export();
})
document.getElementById("export-json").addEventListener("click", () => {
    Pixelrat.exportJSON();
})