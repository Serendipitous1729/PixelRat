class DrawingArea {
    constructor(ctx, EventManager, ToolManager, LayerManager) {
        this.ctx = ctx;

        this.input = EventManager;
        this.previousRecordedMousePosition = new Vector2(this.input.mouse.x, this.input.mouse.y);

        this.tools = ToolManager;

        this.pan = new Vector2(0, 0);
        this.zoom = 1;

        // this.width and this.height are now defined by getters and setters
        this.pixelsize = 10;

        this.maxUndoSteps = 100;
        this.undoStack = [];
        this.redoStack = [];

        this.layerManager = LayerManager;

        // this.layers is also now a getter!!! :o
        this.overlay = new Layer(this.width, this.height);
        // this.activeLayerIndex is also now a getter

        const projectTool = this.tools.getTool("Project");
        const viewportTool = this.tools.getTool("Viewport");
        const layerTool = this.tools.getTool("Layer");

        // TODO: add an option to set a callback for each input in tools that is fired when addChangeListener fires
        // instead of doing messy stuff here

        // changing pixel size, project width and project height
        projectTool.inputs[1].addChangeListener((changedPixelsize) => {
            this.pixelsize = changedPixelsize;
        });
        projectTool.inputs[2].addChangeListener((changedW) => {
            this.setWidth(changedW);
        });
        projectTool.inputs[3].addChangeListener((changedH) => {
            this.setHeight(changedH);
        });

        // loading in a project json
        projectTool.inputs[0].addChangeListener((file) => {
            if (file !== "") {
                let jsonFile = projectTool.inputs[0]._elem.files[0];
                const reader = new FileReader();
                reader.onload = () => {
                    this.loadProject(reader.result);
                };
                reader.readAsText(jsonFile);
            }
        });

        // when zoom is reset, zoom to fit is turned off
        viewportTool.inputs[2]._elem.addEventListener("click", () => {
            viewportTool.inputs[1].value = false;
            this.zoomReset();
            this.tools.getTool("Viewport").inputs[5].value = this.zoom;
        });

        // undo & redo buttons
        projectTool.inputs[4]._elem.addEventListener("click", () => {
            this.undo();
        });
        projectTool.inputs[5]._elem.addEventListener("click", () => {
            this.redo();
        });

        // when viewport is centred, pan can't be set
        if (viewportTool.inputs[0].value) {
            viewportTool.inputs[3]._elem.readonly = true;
            viewportTool.inputs[4]._elem.readonly = true;
        } else {
            viewportTool.inputs[3].readonly = false;
            viewportTool.inputs[4].readonly = false;
        }
        viewportTool.inputs[0].addChangeListener((newVal) => {
            if (newVal) {
                viewportTool.inputs[3]._elem.readonly = true;
                viewportTool.inputs[4]._elem.readonly = true;
            } else {
                viewportTool.inputs[3].readonly = false;
                viewportTool.inputs[4].readonly = false;
            }
        });

        // when zoom to fit is on, zoom value can't be set
        if (viewportTool.inputs[1].value) {
            viewportTool.inputs[5]._elem.readonly = true;
        } else {
            viewportTool.inputs[5].readonly = false;
        }
        viewportTool.inputs[1].addChangeListener((newVal) => {
            if (viewportTool.inputs[1].value) {
                viewportTool.inputs[5]._elem.readonly = true;
            } else {
                viewportTool.inputs[5].readonly = false;
            }
        });

        // the layer name, opacity, etc.
        layerTool.inputs[0].addChangeListener((newVal) => {
            this.activeLayer.name = newVal;
        }, { scriptChange: false, userChange: true });

        layerTool.inputs[1].addChangeListener((newVal) => {
            this.activeLayer.opacity = parseFloat(newVal);
        }, { scriptChange: false, userChange: true });

        // KEY SHORTCUTS
        this.input.addEventListener("keydown", (e) => {
            if(e.ctrlKey) {
                if(e.key === "z") {
                    this.undo();
                    // for some reason checking shiftkey doesnt work?
                } else if (e.key === "y") {
                    this.redo();
                }
            }
            if(e.code.slice(0, 5) === "Digit") {
                if(this.tools.tools[parseInt(e.key) - 1]) {
                    this.tools.whenToolSelected(this.tools.tools[parseInt(e.key) - 1]); // hotkeying to tool
                }
            }
        })

        // what all events need listening to? in the tools
        let eventsToListenTo = [];
        for (let tool of this.tools.tools) {
            if (tool.eventListeners) {
                for (let event in tool.eventListeners) {
                    if(eventsToListenTo.indexOf(event) == -1) {
                        eventsToListenTo.push(event);
                    }
                }
            }
        }

        // actually listen to those events and notify the tools
        for (let event of eventsToListenTo) {
            this.input.addEventListener(event, (e) => {
                // trigger eventListener only for selected tool
                let selectedTool = this.tools.selectedTool;
                if (selectedTool.eventListeners && selectedTool.eventListeners[event]) {
                    selectedTool.eventListeners[event](this, e, selectedTool);
                }
            });
        }

        // listen to layer change events
        this.layerManager.addLayerChangeListener((val) => {
            this.tools.tools.forEach((tool) => {
                if (tool.layerChangeListener) {
                    tool.layerChangeListener(this, val, tool);
                }
            });
        });

        let valuesDisplay = document.getElementById("values-display");
        this.input.addEventListener("mousemove", () => {
            let coords = this.indicesOfHoveredOverPixel;
            valuesDisplay.innerText = `x: ${coords.x}, y: ${coords.y}`;
        });
    }

    get width() {
        return this.layerManager.width;
    }
    get height() {
        return this.layerManager.height;
    }
    set width(x) {
        this.layerManager.width = x;
    }
    set height(x) {
        this.layerManager.height = x;
    }

    get activeLayerIndex() {
        return this.layerManager.activeLayerIndex;
    }

    get trueWidth() {
        return this.width * this.pixelsize;
    }

    get trueHeight() {
        return this.height * this.pixelsize;
    }

    get layers() {
        return this.layerManager.layers;
    }

    panCenter() {
        this.pan.set(Math.floor(0.5 * (this.ctx.canvas.width - this.width * this.zoomedPixelSize)), Math.floor(0.5 * (this.ctx.canvas.height - this.height * this.zoomedPixelSize)));
    }

    zoomReset() {
        this.zoom = 1;
    }

    zoomToFit() {
        this.zoom = Math.min(this.ctx.canvas.width / this.trueWidth, this.ctx.canvas.height / this.trueHeight);
    }

    setWidth(val) {
        this.width = val;
        this.overlay.resize(this.width, this.height);
    }
    setHeight(val) {
        this.height = val;
        this.overlay.resize(this.width, this.height);
    }

    get zoomedPixelSize() {
        return this.pixelsize * this.zoom;
    }

    roundingErrToNextSquare(pixelNumber) {
        // floor(p) + floor(q) is sometimes 1 less than floor(x + y)
        // so sometimes there are 1 px gaps between squares, i.e. floor(nth x pos) + floor(width) < floor(n+1th xpos)
        // floor(x) + floor(y) < floor(x+y) if and only if (decimal part of x) + (decimal part of y) > 1
        return Math.floor((pixelNumber + 1) * this.zoomedPixelSize)
            - Math.floor(pixelNumber * this.zoomedPixelSize)
            - Math.floor(this.zoomedPixelSize);
    }

    getTruePixelSize(index) {
        return Math.floor((index + 1) * this.zoomedPixelSize) - Math.floor(index * this.zoomedPixelSize);
        // because of all this flooring business
        // the pixels don't have a fixed size (in screen space)
        // so the easiest way to find their size (only way i could think of)
        // is subtracting this pixel's starting coordinate from next pixel's starting coordinate
        // P.S. here size refers to both width and height, since calculations are same for both
    }

    calculateCombinedLayer(doTransparencyPattern) {
        let finalImage = new Layer(this.width, this.height); // combine each layer's data into 1 layer
        for (let i = doTransparencyPattern ? -1 : 0; i <= this.layers.length; i++) {
            // i starts at -1 only if we want the checkered transparency pattern

            let layer = (i === -1 || i == this.layers.length) ? this.overlay : this.layers[i];
            // `layers.length`th index stands for an overlay layer that is reset each frame
            // and -1th index is the transparency pattern, so we assign it to a random layer

            let layerOpacity = layer.opacity;
            layer.parseAndModifyData((x, y, value) => {
                if (i === -1) {
                    // transparency pattern
                    let tColor1 = this.parseHexOpacityIntoColorArray(this.tools.getTool("Viewport").inputs[6].value, 1);
                    let tColor2 = this.parseHexOpacityIntoColorArray(this.tools.getTool("Viewport").inputs[7].value, 1)
                    finalImage.set(x, y, (x + y) % 2 == 0 ? tColor1 : tColor2);
                } else {
                    let combined = finalImage.data[x][y];
                    let onTop = value.map((channel) => parseFloat(channel));
                    onTop[3] = onTop[3] * layerOpacity;
                    if (onTop[3] !== 0) { // if it's already competely transparent, theres no point in doing these calculations - we know they won't have any effect
                        // finalImage.set(x, y, [
                        //     this.alphaBlend(finalImage.data[x][y][0], parseFloat(value[0]), layerOpacity * parseFloat(value[3])),
                        //     this.alphaBlend(finalImage.data[x][y][1], parseFloat(value[1]), layerOpacity * parseFloat(value[3])),
                        //     this.alphaBlend(finalImage.data[x][y][2], parseFloat(value[2]), layerOpacity * parseFloat(value[3])),
                        //     1
                        // ]);



                        finalImage.set(x, y, [
                            (onTop[0] * onTop[3] + combined[0] * combined[3] * (1 - onTop[3])) / (onTop[3] + combined[3] * (1 - onTop[3])),
                            (onTop[1] * onTop[3] + combined[1] * combined[3] * (1 - onTop[3])) / (onTop[3] + combined[3] * (1 - onTop[3])),
                            (onTop[2] * onTop[3] + combined[2] * combined[3] * (1 - onTop[3])) / (onTop[3] + combined[3] * (1 - onTop[3])),
                            onTop[3] + combined[3] * (1 - onTop[3])
                        ]); // trust
                        // idk how it works either
                    }
                }
            });
        }
        return finalImage;
    }

    render() {
        // canvas zoom (calculate zoom first always)
        if (this.tools.getTool("Viewport").inputs[1].value === 'true') { // zoom to fit
            this.zoomToFit();
            this.tools.getTool("Viewport").inputs[5].value = this.zoom;
        } else {
            this.zoom = this.tools.getTool("Viewport").inputs[5].value
        }

        // canvas pan
        if (this.tools.getTool("Viewport").inputs[0].value === 'true') { // center viewport
            this.panCenter();
            this.tools.getTool("Viewport").inputs[3].value = this.pan.x;
            this.tools.getTool("Viewport").inputs[4].value = this.pan.y;
        } else {
            this.pan.x = this.tools.getTool("Viewport").inputs[3].value;
            this.pan.y = this.tools.getTool("Viewport").inputs[4].value;
        }

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        let selectedTool = this.tools.selectedTool;
        this.layers.forEach((layer, i) => {
            layer.parseAndModifyData((x, y, value) => {
                if (selectedTool.forEachPixel) {
                    selectedTool.forEachPixel(this, i, { x: x, y: y }, selectedTool);
                }
            });
        });

        let finalImage = this.calculateCombinedLayer(true);

        finalImage.parseAndModifyData((x, y, value) => {

            // we end up drawing each pixel only once, which is a massive timesave if theres a lot of layers
            this.ctx.fillStyle = `rgba(${value.join(",")})`;

            this.ctx.fillRect(
                Math.floor(this.pan.x) + Math.floor(this.zoomedPixelSize * x),
                Math.floor(this.pan.y) + Math.floor(this.zoomedPixelSize * y),
                this.getTruePixelSize(x),
                this.getTruePixelSize(y)
            );

            let highlightCheckerFunction = selectedTool.isPixelHighlighted || function (drawingArea, pixelIndex) {
                let { indicesOfHoveredOverPixel } = drawingArea;
                let { x, y } = pixelIndex;
                if (indicesOfHoveredOverPixel.x == x && indicesOfHoveredOverPixel.y == y) return true;
                return false;
            }

            // highlight on pixels drawn over everything else
            if (highlightCheckerFunction(this, { x: x, y: y }, selectedTool)) {
                // highlighted pixels are slightly darker
                this.ctx.fillStyle = "rgb(80, 80, 80, 0.7)"; // good value
                this.ctx.fillRect(
                    Math.floor(this.pan.x) + Math.floor(this.zoomedPixelSize * x),
                    Math.floor(this.pan.y) + Math.floor(this.zoomedPixelSize * y),
                    this.getTruePixelSize(x),
                    this.getTruePixelSize(y)
                );
            }
        })

        this.previousRecordedMousePosition.set(this.input.mouse.x, this.input.mouse.y);
    }

    export() {
        // create a new temporary canvas!
        let imageCanvas = document.createElement("canvas");
        let imageCtx = imageCanvas.getContext("2d");
        imageCanvas.width = this.width * this.pixelsize;
        imageCanvas.height = this.height * this.pixelsize;
        // render the image!
        let finalLayer = this.calculateCombinedLayer(false);
        finalLayer.parseAndModifyData((x, y, value) => {
            imageCtx.fillStyle = `rgba(${value.join(",")})`;
            imageCtx.fillRect(x * this.pixelsize, y * this.pixelsize, this.pixelsize, this.pixelsize);
        });
        // get the rendered image as a data url!
        imageCanvas.toBlob((canvasBlob) => {
            let a = document.createElement("a");
            a.download = "pixelrat-image.png";
            a.href = window.URL.createObjectURL(canvasBlob, { type: "image/png" });
            // start the download!!
            a.click();
        })
    }

    getPixelIndicesFromScreenspaceCoordinates(x, y) {
        return {
            x: Math.floor((x - Math.floor(this.pan.x)) / this.zoomedPixelSize),
            y: Math.floor((y - Math.floor(this.pan.y)) / this.zoomedPixelSize),
        };
    }

    get indicesOfHoveredOverPixel() {
        return this.getPixelIndicesFromScreenspaceCoordinates(this.input.mouse.x, this.input.mouse.y);
    }

    get activeLayer() {
        return this.layers[this.activeLayerIndex];
    }

    parseHexOpacityIntoColorArray(hex, opacity) {
        let hexArr = hex.split("");
        hexArr.shift();
        let finalArr = [];
        finalArr[0] = parseInt(hexArr.splice(0, 2).join(""), 16);
        finalArr[1] = parseInt(hexArr.splice(0, 2).join(""), 16);
        finalArr[2] = parseInt(hexArr.splice(0, 2).join(""), 16);
        finalArr[3] = parseFloat(opacity);
        return finalArr;
    }

    isPixelOnLine(pixelIndices, lineStartIndices, lineEndIndices, lineWidth) {
        let lineVector = Vector2.Sub(new Vector2(lineEndIndices), new Vector2(lineStartIndices));
        let lineLength = lineVector.mag;
        lineVector.normalize();

        let linePerpVector = Vector2.Rotate(lineVector, Math.PI / 2);
        let pixelVector = Vector2.Sub(new Vector2(pixelIndices), new Vector2(lineStartIndices));

        if (
            (pixelIndices.x == lineStartIndices.x && pixelIndices.y == lineStartIndices.y) ||
            (pixelIndices.x == lineEndIndices.x && pixelIndices.y == lineEndIndices.y) ||
            (Vector2.Dot(linePerpVector, pixelVector) > -lineWidth / 2 && Vector2.Dot(linePerpVector, pixelVector) < lineWidth / 2 &&
                Vector2.Dot(lineVector, pixelVector) > 0 && Vector2.Dot(lineVector, pixelVector) < lineLength)
        ) {
            return true;
        }
        return false;
    }

    clearOverlay() {
        // expect anyone who uses the overlay to clean up after them
        this.overlay = new Layer(this.width, this.height);
    }

    bresnham(startVector, endVector) {
        let lineIndicesArray = [];
        let lineVector = Vector2.Sub(endVector, startVector);
        if (lineVector.x >= Math.abs(lineVector.y)) {
            let slope = lineVector.y / lineVector.x;
            for (let x = 0; x <= lineVector.x; x++) {
                lineIndicesArray.push({ x: startVector.x + x, y: startVector.y + Math.round(slope * x) });
            }
        }
        if (lineVector.x <= -Math.abs(lineVector.y)) {
            let slope = lineVector.y / lineVector.x;
            for (let x = 0; x >= lineVector.x; x--) {
                lineIndicesArray.push({ x: startVector.x + x, y: startVector.y + Math.round(slope * x) });
            }
        }
        if (lineVector.y >= Math.abs(lineVector.x)) {
            let slope = lineVector.x / lineVector.y;
            for (let y = 0; y <= lineVector.y; y++) {
                lineIndicesArray.push({ x: startVector.x + Math.round(slope * y), y: startVector.y + y });
            }
        }
        if (lineVector.y <= -Math.abs(lineVector.x)) {
            let slope = lineVector.x / lineVector.y;
            for (let y = 0; y >= lineVector.y; y--) {
                lineIndicesArray.push({ x: startVector.x + Math.round(slope * y), y: startVector.y + y });
            }
        }
        return lineIndicesArray;
    }

    outlineEllipse(startPoint, diameterVector, treatStartPointAsOrigin, storeIndicesHashedByX) {
        let circleIndicesArray = [];

        let endPoint = Vector2.Add(startPoint, treatStartPointAsOrigin ? Vector2.Mult(diameterVector, 2) : diameterVector); // the `diameter` is actually the radius if `startPoint` is the centre!
        let startIndices = new Vector2(Math.min(startPoint.x, endPoint.x), Math.min(startPoint.y, endPoint.y));
        let endIndices = new Vector2(Math.max(startPoint.x, endPoint.x), Math.max(startPoint.y, endPoint.y));

        let sizeVector = Vector2.Sub(endIndices, startIndices);
        let halfSizeVector = Vector2.Mult(sizeVector, 0.5);

        let w = halfSizeVector.x;
        let h = halfSizeVector.y;

        let xValWhereSlopeIs1 = Math.ceil((w * w) / Math.sqrt(w * w + h * h)); // actually its -1 i think but who cares its symmetrical
        let yValWhereSlopeIs1 = Math.ceil((h * h) / Math.sqrt(w * w + h * h));

        let xOffset = treatStartPointAsOrigin ? 0 : Math.floor(diameterVector.x / 2); // using `diameterVector` is important as it is signed
        let yOffset = treatStartPointAsOrigin ? 0 : Math.floor(diameterVector.y / 2);

        function add(x, y) { // add point to array
            if (storeIndicesHashedByX) {
                // key is `x`, value is `y`
                // for every x there are two ys in a circle
                // here `circleIndicesArray` is supposed to mean circleIndicesOBJECT but eh
                if (circleIndicesArray[x] === undefined) {
                    circleIndicesArray[x] = {
                        min: y,
                        max: y
                    };
                } else {
                    if (y < circleIndicesArray[x].min) {
                        circleIndicesArray[x].min = y
                    }
                    if (y > circleIndicesArray[x].max) {
                        circleIndicesArray[x].max = y
                    }
                }
            } else {
                circleIndicesArray.push(new Vector2(x, y));
            }
        }

        for (let x = 0; x <= xValWhereSlopeIs1; x++) {
            let y = h * Math.sqrt(1 - (x * x) / (w * w));
            let rX = Math.round(x);
            let rY = Math.round(y);
            add(rX + xOffset + startPoint.x, rY + yOffset + startPoint.y);
            add(rX + xOffset + startPoint.x, -rY + yOffset + startPoint.y);
            add(-rX + xOffset + startPoint.x, rY + yOffset + startPoint.y);
            add(-rX + xOffset + startPoint.x, -rY + yOffset + startPoint.y);
        }
        for (let y = 0; y <= yValWhereSlopeIs1; y++) {
            let x = w * Math.sqrt(1 - (y * y) / (h * h));
            let rX = Math.round(x);
            let rY = Math.round(y);
            add(rX + xOffset + startPoint.x, rY + yOffset + startPoint.y);
            add(rX + xOffset + startPoint.x, -rY + yOffset + startPoint.y);
            add(-rX + xOffset + startPoint.x, rY + yOffset + startPoint.y);
            add(-rX + xOffset + startPoint.x, -rY + yOffset + startPoint.y);
        }
        return circleIndicesArray;
    }

    // and this one works as expected (i.e. terribly) for making thick ellipses
    // thickEllipse(startPoint, outerDiameter, innerDiameter, treatStartPointAsOrigin) {
    //     let circleIndicesArray = [];

    //     let endPoint = Vector2.Add(startPoint, outerDiameter);
    //     let startIndices = new Vector2(Math.min(startPoint.x, endPoint.x), Math.min(startPoint.y, endPoint.y));
    //     let endIndices = new Vector2(Math.max(startPoint.x, endPoint.x), Math.max(startPoint.y, endPoint.y));

    //     let sizeVector = Vector2.Sub(endIndices, startIndices);

    //     let halfSizeVector = Vector2.Mult(sizeVector, 0.5);
    //     let w = halfSizeVector.x;
    //     let h = halfSizeVector.y;

    //     let iendPoint = Vector2.Add(startPoint, innerDiameter);
    //     let istartIndices = new Vector2(Math.min(startPoint.x, iendPoint.x), Math.min(startPoint.y, iendPoint.y));
    //     let iendIndices = new Vector2(Math.max(startPoint.x, iendPoint.x), Math.max(startPoint.y, iendPoint.y));
    //     let isizeVector = Vector2.Sub(iendIndices, istartIndices);
    //     let ihalfSizeVector = Vector2.Mult(isizeVector, 0.5);
    //     let iw = ihalfSizeVector.x;
    //     let ih = ihalfSizeVector.y;

    //     let xOffset = treatStartPointAsOrigin ? 0 : outerDiameter.x / 2; // using `diameterVector` is important as it is signed
    //     let yOffset = treatStartPointAsOrigin ? 0 : outerDiameter.y / 2;

    //     for (let x = -w; x <= w; x++) {
    //         for (let y = -h; y <= h; y++) {
    //             let isInOuterCircle = (x*x)/(w*w) + (y*y)/(h*h) <= 1;
    //             let isOutOfInnerCircle = (x*x)/(iw*iw) + (y*y)/(ih*ih) >= 1;
    //             if(isInOuterCircle && isOutOfInnerCircle) {
    //                 circleIndicesArray.push({x: Math.round(x + xOffset), y: Math.round(y + yOffset)});
    //             }
    //         }
    //     }

    //     return circleIndicesArray;
    // }

    // but we can use the same idea to make completely filled circles, that we sweep across the ellipse to thicken it!

    filledCircle(center, radius) {
        let indicesArray = [];

        let outerEllipse = this.outlineEllipse(center, new Vector2(1, 1).mult(radius), true, true);
        for (let x in outerEllipse) {
            for (let y = outerEllipse[x].min; y <= outerEllipse[x].max; y++) {
                indicesArray.push({ x: parseInt(x), y: y });
            }
        }
        return indicesArray;
    }

    filledSquare(center, side) {
        let indicesArray = [];
        for (let x = center.x - Math.floor(side / 2); x < center.x + Math.ceil(side / 2); x++) {
            for (let y = center.y - Math.floor(side / 2); y < center.y + Math.ceil(side / 2); y++) {
                indicesArray.push({ x: x, y: y });
            }
        }
        return indicesArray;
    }

    alphaBlend(bottomColor, topColor, topColorAlpha) {
        // for a single channel (R/G/G) only!
        return topColorAlpha * (topColor - bottomColor) + bottomColor; // its just linear interpolation, but simplified formula
    } // old, not used in favour of new proper formula that works properly with no transparency pattern

    getProjectAsJSON() {
        const data = {
            pixelRat: "PIXELRAT",
            dataVersion: 1.0,
            pan: this.pan,
            zoom: this.zoom,
            layerManager: {
                width: this.layerManager.width,
                height: this.layerManager.height,
                activeLayerIndex: this.layerManager.activeLayerIndex,
                layers: []
            },
            tools: {
                tools: []
            }
        }
        // copy layers
        let LayerValidKeys = ["name", "width", "height", "opacity", "data"]
        this.layerManager.layers.forEach((layer, i) => {
            data.layerManager.layers[i] = {};
            LayerValidKeys.forEach((key) => {
                data.layerManager.layers[i][key] = layer[key];
            });
        });
        // copy input values
        this.tools.tools.forEach((tool, i) => {
            data.tools.tools[i] = {
                inputs: []
            }
            tool.inputs.forEach((input, j) => {
                data.tools.tools[i].inputs[j] = {
                    value: input["value"]
                }
            });
        });

        return JSON.stringify(data);
    }

    exportJSON() {
        let json = this.getProjectAsJSON();
        let a = document.createElement("a");
        a.download = "pixelrat-project.json";
        let jsonBlob = new Blob([json], { type: "application/json" });
        a.href = window.URL.createObjectURL(jsonBlob, { type: "text/json" });
        // start the download!!
        a.click();
    }

    loadProject(json) {
        let obj = JSON.parse(json);

        if (obj.pixelRat !== "PIXELRAT") {
            alert("i'm pretty sure this isn't a PixelRat project file");
            this.tools.getTool("Project").inputs[0].value = "";
            return;
        }

        if (obj.dataVersion !== 1) {
            alert("uh i think this project file is of a different version of PixelRat, sorry");
            this.tools.getTool("Project").inputs[0].value = "";
            return;
        }

        this.pan = new Vector2(obj.pan);
        this.zoom = obj.zoom;

        // reset layers
        this.layerManager.layers = [];
        this.layerManager.width = obj.layerManager.width;
        this.layerManager.height = obj.layerManager.height;
        obj.layerManager.layers.forEach((layer, i) => {
            this.layerManager.addLayer(layer.name, i);
            this.layerManager.layers[i].data = layer.data;
            this.layerManager.layers[i].opacity = layer.opacity;
        });
        this.layerManager.activeLayerIndex = obj.layerManager.activeLayerIndex;
        this.layerManager.refreshLayerContainer();

        // set input values
        obj.tools.tools.forEach((tool, i) => {
            tool.inputs.forEach((input, j) => {
                if (this.tools.tools[i].inputs[j].type !== "file") {
                    this.tools.tools[i].inputs[j].value = input.value;
                }
            });
        });

        // and hope that it works
    }

    pushToUndoStack() {
        // call this when you "do" something
        if (this.undoStack.length < this.maxUndoSteps) {
            this.redoStack = []; // reset the redo stack
            let state = this.getProjectAsJSON();
            this.undoStack.push(state);
        }
    }
    undo() {
        if (this.undoStack.length > 0) {
            let undone = this.undoStack.pop();
            this.redoStack.push(this.getProjectAsJSON());
            this.loadProject(undone);
        }
    }
    redo() {
        if(this.redoStack.length > 0) {
            let redone = this.redoStack.pop();
            this.undoStack.push(this.getProjectAsJSON());
            this.loadProject(redone);
        }
    }
}