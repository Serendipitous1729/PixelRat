class Layer {
    constructor(width, height, name) {

        this.width = width;
        this.height = height;

        this.opacity = 1;

        this.elem = document.createElement("div");
        this.elem.classList.add("layer");

        if (name !== undefined) {
            this.name = name;
        }

        this.populateData();
    }

    get name() {

        return this.elem.innerText;
    }
    set name(newName) {
        this.elem.innerText = newName;
    }

    populateData() {
        this.data = [];
        for (let x = 0; x < this.width; x++) {
            this.data[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.data[x][y] = [0, 0, 0, 0]; // [R, G, B, a]
            }
        }
    }

    resize(width, height) {
        this.width = width;
        this.height = height;

        this.data.length = this.width;
        for (let x = 0; x < this.width; x++) {
            if (this.data[x] == undefined) {
                this.data[x] = [];
            }

            this.data[x].length = this.height;
            for (let y = 0; y < this.height; y++) {
                this.data[x][y] = this.data[x][y] || [0, 0, 0, 0]; // if it's been made bigger, the new pixels should be transparent
            }
        }
    }

    parseAndModifyData(callback) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let newValue = callback(x, y, this.data[x][y]);
                if (newValue != undefined) {
                    this.data[x][y] = newValue;
                }
            }
        }
    }

    set(x, y, val) {
        if (this.isIndexValid(x, y)) {
            this.data[x][y] = val;
            return true;
        }
        return false;
    }

    isIndexValid(x, y) {
        return this.data[x] !== undefined && this.data[x][y] !== undefined;
    }
}