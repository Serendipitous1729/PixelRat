class LayerManager {
    constructor() {
        // this.width and this.height are defined using getters and setters
        this.widthValue = 100;
        this.heightValue = 100;

        this.layers = [];
        this.layerContainer = document.getElementById("layers-list");
        this.layerTools = document.getElementsByClassName("layer-tool-button");

        this.layerChangeListeners = [];

        // this.activeLayerIndex is also defined using getters and setters
        this.addLayer("background", 0);
        this.activeLayerIndex = 0;
        this.refreshLayerContainer();

        let newLayerNumber = 1;
        this.layerTools[0].addEventListener("click", () => {
            this.addLayer(`layer ${newLayerNumber}`, this.activeLayerIndex + 1);
            newLayerNumber++;
        });

        this.layerTools[1].addEventListener("click", () => {
            this.removeLayer(this.activeLayerIndex);
        });

        this.layerTools[2].addEventListener("click", () => {
            this.swapLayers(this.activeLayerIndex, this.activeLayerIndex - 1);
        });

        this.layerTools[3].addEventListener("click", () => {
            this.swapLayers(this.activeLayerIndex, this.activeLayerIndex + 1);
        });
    }

    get width() {
        return this.widthValue;
    }
    get height() {
        return this.heightValue;
    }
    set width(x) {
        this.widthValue = x;
        for (let layer of this.layers) {
            layer.resize(this.widthValue, this.heightValue);
        }
    }
    set height(x) {
        this.heightValue = x;
        for (let layer of this.layers) {
            layer.resize(this.widthValue, this.heightValue);
        }
    }

    get activeLayerIndex() {
        return this.activeLayerIndexValue;
    }
    set activeLayerIndex(val) {
        this.layerChangeListeners.forEach((callback) => {
            callback(val); // fire change listeners
        });
        this.activeLayerIndexValue = val;
    }

    addLayer(name, index) {
        let newLayer = new Layer(this.width, this.height, name);
        this.layers.splice(index, 0, newLayer);

        // adding click event listener
        newLayer.elem.addEventListener("click", () => {
            this.activeLayerIndex = this.layers.indexOf(newLayer);
            this.refreshLayerContainer();
        });

        this.activeLayerIndex = index;

        this.refreshLayerContainer();
    }

    removeLayer(index) {
        if (this.layers[index] !== undefined && this.layers.length >= 2) {
            this.layers.splice(index, 1);
        }

        if (this.activeLayerIndex >= this.layers.length) this.activeLayerIndex = this.layers.length - 1;

        this.refreshLayerContainer();
    }

    swapLayers(index1, index2) {
        if (this.layers[index1] === undefined || this.layers[index2] === undefined) {
            return;
        } else {
            let buffer = this.layers[index1];
            this.layers[index1] = this.layers[index2];
            this.layers[index2] = buffer;
        }

        // if the active layer was swapped, set activeLayerIndex accordingly
        if(this.activeLayerIndex === index1){
            this.activeLayerIndex = index2;
        }
        else if(this.activeLayerIndex === index2){
            this.activeLayerIndex = index1;
        }


        this.refreshLayerContainer();
    }

    refreshLayerContainer() {
        this.layerContainer.innerHTML = "";
        for(let i = 0; i < this.layers.length; i++) {
            let layer = this.layers[i];

            if(this.activeLayerIndex == i) {
                layer.elem.classList.add("active-layer");
            } else {
                layer.elem.classList.remove("active-layer");
            }

            this.layerContainer.append(layer.elem);
        }
    }

    addLayerChangeListener(callback) {
        this.layerChangeListeners.push(callback);
    }

    removeLayerChangeListener(callback) {
        this.layerChangeListeners.splice(this.layerChangeListeners.indexOf(callback), 1);
    }
}