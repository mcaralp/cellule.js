
const util = require('./util');

module.exports = class Renderer
{
    constructor(global)
    {
        this.global      = global;
        this.fps         = 30; 
        this.step        = 0;
        this.currentCell = null;
        this.currentId   = -1;

        this.width       = 100;
        this.height      = 100;
        this.cellSize    = 1;  
        this.canvas      = null;
        this.parentId    = null;
        this.interval    = null;  
        this.setupDone   = false;
    }

    setCellSize(size)
    {
        if(this.setupDone)
            throw new Error('This function can only be called in the setup function.');

        this.cellSize = size;
    }

    setSize(width, height)
    {   
        if(this.setupDone)
            throw new Error('This function can only be called in the setup function.');

        this.width = width;
        this.height = height;
    }

    setParent(parentId)
    {
        if(this.setupDone)
            throw new Error('This function can only be called in the setup function.');

        this.parentId = parentId;
    }

    getFramerate()
    {
        return this.fps;
    }

    setFramerate(fps)
    {
        this.fps = fps;

        if(this.interval != null)
        {
            clearInterval(this.interval);
            this.interval = setInterval(this.onRender.bind(this), Math.floor(1000 / this.fps));
        }
    }

    setPoint(x, y, c)
    {
        if(this.currentCell == null)
            throw Error('This function can only be called in loop function.');

        if(c.h != undefined) c = util.hsvToRgb(c);

        let p = this.currentCell.pos[y] + x * 4;
        this.image.data[p + 0] = c.r; 
        this.image.data[p + 1] = c.g; 
        this.image.data[p + 2] = c.b; 
        this.image.data[p + 3] = 255; 
    }

    setBackground(c)
    {
        if(c.h != undefined) c = util.hsvToRgb(c);

        for(let i = 0; i < this.cellSize; ++i)
        {
            for (let j = 0; j < this.cellSize; ++j)
            {
                this.setPoint(i, j, c);
            }
        }
    }

    getId()
    {
        if(this.currentId == null)
            throw Error('This function can only be called in loop or construct function.');
        return this.currentId;
    }

    getCell()
    {
        if(this.currentCell == null)
            throw Error('This function can only be called in loop function.');
        return this.currentCell.cell;
    }

    cloneCell()
    {
        if(this.currentCell == null)
            throw Error('This function can only be called in loop function.');

        return JSON.parse(JSON.stringify(this.currentCell.cell));
    }

    getNeighbor(index)
    {
        if(this.currentCell == null)
            throw Error('This function can only be called in loop function.');

        return this.currentCell.neighborhood[index] == null ? null : this.currentCell.neighborhood[index].cell;
    }

    createAutomaton()
    {
        this.canvas  = document.createElement('canvas');
        
        if(typeof this.parentId == 'string' && this.parentId != null)
        {
            let parent = document.getElementById(this.parentId);
            parent.appendChild(this.canvas);
        }
        else 
            document.body.appendChild(this.canvas);

        this.canvas.width  = this.width * this.cellSize;
        this.canvas.height = this.height * this.cellSize;

        this.context = this.canvas.getContext('2d');
        this.image   = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        this.cells    = [
            new Array(this.width * this.height),
            new Array(this.width * this.height)
        ];

        for(let i = 0; i < this.width * this.height; ++i)
        {
            this.cells[0][i] = {cell: null, neighborhood: null, pos: null};
            this.cells[1][i] = {cell: null, neighborhood: null, pos: null};
        }

        for(let i = 0; i < this.width * this.height; ++i)
        {
            let x = i % this.width;
            let y = Math.floor(i / this.width);

            let neighborhood = this.computeNeighborhood(x, y);

            let pos = new Array(this.cellSize);
            for(let j = 0; j < pos.length; ++j)
                pos[j] = ((j + y * this.cellSize) * this.width + x) * this.cellSize * 4;

            this.cells[0][i].neighborhood = neighborhood[0];
            this.cells[1][i].neighborhood = neighborhood[1];
            this.cells[0][i].pos = pos;
            this.cells[1][i].pos = pos;

        }
    }

    computeNeighborhood(x, y)
    {
        let pos = [
            [-1, -1], // TOPLEFT
            [ 0, -1], // TOP
            [ 1, -1], // TOPRIGHT
            [ 1,  0], // RIGHT
            [ 1,  1], // BOTTOMRIGHT
            [ 0,  1], // BOTTOM
            [-1,  1], // BOTTOMLEFT
            [-1,  0]  // LEFT
        ];

        let neighborhood = [[], []];

        for(let i = 0; i < pos.length; ++i)
        {
            let newX = x + pos[i][0];
            let newY = y + pos[i][1];

            if(newX < 0 || newX >= this.width || newY < 0 || newY >= this.height)
            {
                neighborhood[0].push(null);
                neighborhood[1].push(null);
            }
            else 
            {
                neighborhood[0].push(this.cells[0][newX + newY * this.width]);
                neighborhood[1].push(this.cells[1][newX + newY * this.width]);
            }
        }

        return neighborhood;

    }

    start()
    {
        if(global.setup)
        {
            global.setup();
        }

        this.createAutomaton();

        if(global.construct)
        {
            for(let i = 0; i < this.width * this.height; ++i)
            {
                this.currentId = i;
                this.cells[this.step][i].cell = global.construct();                    
            }

            this.currentCell = null;
            this.currentId   = -1;
        }
        this.interval = setInterval(this.onRender.bind(this), Math.floor(1000 / this.fps));
    }

    onRender()
    {
        if(global.loop == undefined) return;
        
        for(let i = 0; i < this.width * this.height; ++i)
        {
            this.currentCell = this.cells[this.step][i];
            this.currentId   = i; 
            this.cells[1 - this.step][i].cell = global.loop();
        }

        this.currentCell = null;
        this.currentId   = -1;

        this.step = 1 - this.step;
        this.context.putImageData(this.image, 0, 0);
    }

};