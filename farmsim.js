// farmsim.js

// Item constructor
function Item(name, type) {
    this.name = name;
    this.id = genId();
    this.type = type;
}
Item.prototype.getName = function() {
    return this.name;
};
// Seed constructor (extends Item)
function Seed(parms) {
    Item.call(this, parms.name, parms.type);
    this.state = "seed"; // seed | planted | sprout | ripe | dead
    this.invImg = parms.invImg;
    this.growthImg0 = parms.growthImg0;
    this.growthImg1 = parms.growthImg1;
    this.ripeImg = parms.ripeImg;
    this.buyPrice = parms.buyPrice;
    this.sellPrice = parms.sellPrice;
    this.timePlanted = null;
    this.durationGrowth0 = parms.durationGrowth0;
    this.durationGrowth1 = parms.durationGrowth1;
    this.quantity = 1;
}
Seed.prototype = new Item();
Seed.prototype.constructor = Seed;
Seed.prototype.clone = function() {
    let seedData = {
	name: this.name,
	type: this.type,
	state: this.state,
	invImg: this.invImg,
	growthImg0: this.growthImg0,
	growthImg1: this.growthImg1,
	ripeImg: this.ripeImg,
	buyPrice: this.buyPrice,
	sellPrice: this.sellPrice,
	timePlanted: this.timePlanted,
	durationGrowth0: this.durationGrowth0,
	durationGrowth1: this.durationGrowth1,
	quantity: this.quantity
    };
    
    return new Seed(seedData);
};
Seed.prototype.currentImage = function() {
    switch(this.state) {
    case "ripe":
	return this.ripeImg;
    case "sprout":
	return this.growthImg0;
    default:
	return this.invImg;
    }
};
// Cumulative growth time from seed to ripe, represented as a string.
Seed.prototype.growthPeriod = function() {
    let total = this.durationGrowth0 + this.durationGrowth1;
    total += " minutes";
    return total;
};
Seed.prototype.getName = function() {
    if (this.type === "seed") {
	switch(this.state) {
	case "seed":
	    return this.name + " seed";
	case "sprout":
	    return this.name + " sprout";
	}
    }

    return this.name;
};
Seed.prototype.timeUntilRipe = function() {
    let now = new Date().getTime();
    let ripeTime = this.timePlanted.getTime() +
	((this.durationGrowth0 + this.durationGrowth1) * 60000);
    if (now < ripeTime) {
	let secs = (ripeTime - now) / 1000;
	if (secs < 60) {
	    return Math.trunc(secs) + " seconds";
	} else {
	    if (secs < 2) {
		return Math.trunc(secs / 60) + " minute";
	    } else {
		return Math.trunc(secs / 60) + " minutes";
	    }
	}
    } else {
	return "0 seconds"
    }
};

// Generate a random alpha-numeric string for use as a unique ID.
function genId() {
    return Math.random().toString(36).substring(2);
}

function dragstartHandler(ev) {
    console.log("dragstart");
    console.log("ev.target.id = " + ev.target.id);
    ev.dataTransfer.setData("text/plain", ev.target.id);
    ev.dataTransfer.dropEffect = "move";
    view.disableTooltip(ev.target.parentNode.parentNode);
}

function dragoverHandler(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
}

function marketDropHandler(ev) {
    //ev.preventDefault();
    let itemId = ev.dataTransfer.getData("text/plain");
    
    if (ev.target instanceof HTMLTableCellElement) {
	cellId = ev.target.id;
    } else {
	cellId = ev.target.parentNode.id;
    }
    controller.dropOnMarket(cellId, itemId);
}

function fieldDropHandler(ev) {
    console.log("in fieldDropHandler");
    ev.preventDefault();
    let itemId = ev.dataTransfer.getData("text/plain");

    if (ev.target instanceof HTMLTableCellElement) {
	cellId = ev.target.id;
    } else {
	cellId = ev.target.parentNode.id;
    }
    console.log("cellId, itemId = " + cellId + ", " + itemId);
    controller.dropOnPlot(cellId, itemId);
}

function supplySelectionHandler(ev) {
    console.log("in supplySelectionHandler");
    console.log("this.id = " + this.id);
    console.log("this.parentElement.nodeName = " + this.parentElement.nodeName);
    
    if (view.isSelected(this)) {
	view.deselect(this);
    } else {
	view.select(this);
    }
}

function buyButtonHandler() {
    console.log("in buyButtonHandler");
    if (model.supSelectCellId) {
	model.buySupItem();
    }
}

// Parse an array of strings and add each one as a separate text node
// to the parent node, interleaved with br nodes.
// parent = DOM node.
// strings = array of strings.
function appendMultilineText(parent, strings) {
    for (i = 0; i < strings.length; i++) {
	parent.appendChild(document.createTextNode(strings[i]));
	if (i < strings.length - 1) {
	    parent.appendChild(document.createElement("br"));
	}
    }
}

let model = {
    gold: 10,
    inv: new Array(10),
    field: new Array(12),
    seeds: initSeeds(),
    supplies: new Array(10),
    supSelectCellId: undefined,
    
    initField: function() {
	console.log("in model.initField");
	let nothing = {
	    name: "nothing"
	};
	for (i = 0; i < this.field.length; i++) {
	    this.field[i] = nothing;
	}

	view.updateField(this.field);
    },

    fieldGetItemById: function(id) {
	console.log("in fieldGetItemById, id = " + id);
	for (let i = 0; i < this.field.length; i++) {
	    if (this.field[i].id === id) {
		return this.field[i];
	    }
	}
    },

    // Remove an item from the field.
    fieldRemove: function(id) {
	for (let i = 0; i < this.field.length; i++) {
	    if (this.field[i].id === id) {
		this.field[i] = nothing;
		break;
	    }
	}
    },

    initInv: function() {
	console.log("in model.initInv");
	for (let i = 0; i < this.inv.length; i++) {
	    this.inv[i] = nothing;
	}
	this.inv[0] = this.seeds[0].clone();
	this.inv[1] = this.seeds[1].clone();
	view.updateInv(this.inv);
    },

    invGetItemById: function(id) {
	for (let i = 0; i < this.inv.length; i++) {
	    if (this.inv[i].id === id) {
		return this.inv[i];
	    }
	}
    },

    invGetItemByName: function(name) {
	for (let i = 0; i < this.inv.length; i++) {
	    if (this.inv[i].name === name) {
		return this.inv[i];
	    }
	}
    },

    invGetTypeById: function(id) {
	for (let i = 0; i < this.inv.length; i++) {
	    if (this.inv[i].id === id) {
		console.log("this.inv[i].type = " + this.inv[i].type);
		console.log("this.inv[i].name = " + this.inv[i].name);
		return this.inv[i].type;
	    }
	}
    },

    invItemNameExists: function(name) {
	for (let i = 0; i < this.inv.length; i++) {
	    if (this.inv[i].name === name) {
		console.log("item name exists in inv");
		return true;
	    }
	}

	return false;
    },

    invIsFull: function() {
	for (let i = 0; i < this.inv.length; i++) {
	    if (this.inv[i].name === "nothing") {
		console.log("not full");
		return false;
	    }
	}

	return true;
    },

    // Add an item to the inventory.
    invAdd: function(item) {
	if (this.invItemNameExists(item.name)) {
	    let invItem = this.invGetItemByName(item.name);
	    invItem.quantity += 1;
	} else {
	    for (let i = 0; i < this.inv.length; i++) {
		if (this.inv[i].name === "nothing") {
		    this.inv[i] = item.clone();
		    break;
		}
	    }
	}
    },

    // Remove an item from the inventory.
    invRemove: function(id) {
	for (let i = 0; i < this.inv.length; i++) {
	    if (this.inv[i].id === id) {
		if (this.inv[i].quantity > 1) {
		    this.inv[i].quantity -= 1;
		} else {
		    this.inv[i] = nothing;
		}
		break;
	    }
	}
    },
    
    initSupplies: function() {
	for (let i = 0; i < this.supplies.length; i++) {
	    this.supplies[i] = nothing;
	}
	this.supplies[0] = this.seeds[0].clone();
	this.supplies[1] = this.seeds[1].clone();
	this.supplies[2] = this.seeds[2].clone();
	this.supplies[3] = this.seeds[3].clone();
	view.updateSupplies(this.supplies);
    },

    supGetItemById: function(id) {
	for (let i = 0; i < this.supplies.length; i++) {
	    if (this.supplies[i].id === id) {
		return this.supplies[i];
	    }
	}
    },

    getItemById: function(id) {
	let item = this.invGetItemById(id);
	if (! item) {
	    item = this.fieldGetItemById(id);
	}
	console.log("in getItemById, item = " + item);
	return item;
    },

    // Attempt to buy the item selected in the Supplies table.
    buySupItem: function() {
	let item = this.supGetItemById(document
				       .getElementById(model.supSelectCellId)
				       .firstChild
				       .firstChild
				       .id);

	if ((! this.invIsFull() || this.invItemNameExists(item.name))
	    && this.gold >= item.buyPrice) {
	    this.gold -= item.buyPrice;
	    this.invAdd(item);
	    view.updateInv(this.inv);
	    view.displayGold(this.gold);
	}
    },
    
    // Plant a seed in a field plot.
    // plotId = field table cell ID.
    // seedId = ID of a seed in inventory.
    plantSeed: function(plotId, seedId) {
	console.log("seedId = " + seedId);
	console.log("plotId = " + plotId);
	
	let i = plotId.replace("field", "");
	console.log("field index = " + i);
	this.field[i] = this.invGetItemById(seedId);
	this.field[i].timePlanted = new Date();
	this.field[i].state = "planted";
	view.updateField(this.field);

	this.invRemove(seedId);
	view.updateInv(this.inv);
    },

    // Iterate through field checking timers. Update plots as necessary.
    monitorField: function() {
	//console.log("in monitorField");
	let now = new Date().getTime();
	for (let i = 0; i < this.field.length; i++) {
	    let plot = this.field[i];
	    if (plot.name !== "nothing") {
		growth0 = plot.timePlanted.getTime() + plot.durationGrowth0 *
		    60000;
		growth1 = growth0 + plot.durationGrowth1 * 60000;
		
		if (now > growth0) {
		    if (plot.state === "planted") {
			console.log("time to sprout!");
			plot.state = "sprout";
		    } else if (plot.state === "sprout" && now > growth1) {
			console.log("ripe!");
			plot.state = "ripe";
		    }
		}
	    }
	}

	view.updateField(this.field);
    },

    sellItem: function(item) {
	console.log("in model.sellItem");
	if (item.type === "seed") {
	    if (item.state === "ripe") {
		this.gold += item.sellPrice;
	    } else {
		this.gold += item.buyPrice;
	    }
	}

	view.displayGold(this.gold);
	
	if (this.invGetItemById(item.id)) {
	    this.invRemove(item.id);
	    view.updateInv(this.inv);
	} else {
	    console.log("calling fieldRemove");
	    this.fieldRemove(item.id);
	    console.log("this.field = " + this.field);
	    view.updateField(this.field);
	}
    }
};

let view = {
    // Update all cells in field table to match field array.
    updateField: function(field) {
	//console.log("in view.updateField");
	for (let i = 0; i < field.length; i++) {
	    let cell = document.getElementById("field" + i);
	    this.removeChildren(cell);

	    if (field[i].name === "nothing") {
		cell.ondragover = dragoverHandler;
		cell.ondrop = fieldDropHandler;
		continue;
	    }

	    cell.ondragover = null;
	    cell.ondrop = null;
	    
	    let div = document.createElement("div");
	    div.setAttribute("id", "fieldDiv" + i);
	    div.setAttribute("class", "fieldItemDiv");

	    let img = document.createElement("img");
	    if (field[i].state === "planted") {
		img.setAttribute("src", "dirt_seeded.png");
	    } else {
		img.setAttribute("src", field[i].currentImage());
	    }
	    img.setAttribute("id", field[i].id);
	    img.ondragstart = dragstartHandler;
	    div.appendChild(img);

	    let span = document.createElement("span");
	    span.setAttribute("class", "fieldTooltip");
	    let txt = [field[i].getName()];
	    if (field[i].state !== "ripe") {
		txt.push("Ripe in " + field[i].timeUntilRipe());
	    } else {
		txt.push("Ripe!");
		txt.push("Sell Price: " + field[i].sellPrice + "gp");
	    }
	    appendMultilineText(span, txt);
	    div.appendChild(span);
	    
	    cell.appendChild(div);
	}
    },

    // Update all cells in inv table to match inv array.
    updateInv: function(inv) {
	console.log("in view.updateInv");
	for (let i = 0; i < inv.length; i++) {
	    let cell = document.getElementById("inv" + i);
	    this.removeChildren(cell);

	    if (inv[i].name === "nothing") {
		continue;
	    }

	    let div = document.createElement("div");
	    div.setAttribute("id", "invDiv" + i);
	    div.setAttribute("class", "invItemDiv");

	    let img = document.createElement("img");
	    img.setAttribute("src", inv[i].invImg);
	    img.setAttribute("id", inv[i].id);
	    img.ondragstart = dragstartHandler;
	    div.appendChild(img);

	    let span = document.createElement("span");
	    span.setAttribute("class", "invTooltip");
	    let txt = [inv[i].getName()];
	    txt.push("Sell Price (seed): " + inv[i].buyPrice + "gp");
	    txt.push("Sell Price (ripe): " + inv[i].sellPrice + "gp");
	    txt.push("Growth Period: " + inv[i].growthPeriod());
	    txt.push("Quantity: " + inv[i].quantity);
	    appendMultilineText(span, txt);
	    div.appendChild(span);

	    cell.appendChild(div);
	}
    },

    updateSupplies: function(supplies) {
	console.log("in view.updateSupplies");
	for (let i = 0; i < supplies.length; i++) {
	    let cell = document.getElementById("sup" + i);
	    this.removeChildren(cell);

	    if (supplies[i].name === "nothing") {
		continue;
	    }

	    cell.onclick = supplySelectionHandler;

	    // This div contains the image and the tooltip. It will also contain
	    // the selector image when triggered.
	    let div = document.createElement("div");
	    div.setAttribute("id", "supDiv" + i);
	    div.setAttribute("class", "supplyItemDiv");

	    let img = document.createElement("img");
	    img.setAttribute("src", supplies[i].invImg);
	    img.setAttribute("id", supplies[i].id);
	    img.setAttribute("draggable", "false");
	    div.appendChild(img);

	    let span = document.createElement("span");
	    span.setAttribute("class", "supTooltip");
	    let txt = [supplies[i].getName()];
	    txt.push("Purchase: " + supplies[i].buyPrice + "gp");
	    txt.push("Sell Price (ripe): " + supplies[i].sellPrice + "gp");
	    txt.push("Growth Period: " + supplies[i].growthPeriod());
	    appendMultilineText(span, txt);
	    div.appendChild(span);

	    cell.appendChild(div);
	}
    },

    isSelected: function(cell) {
	console.log("in view.isSelected");
	if (cell.id === model.supSelectCellId) {
	    return true;
	}

	return false;
    },

    // Visually select a cell. Deselect any other cells in the same table.
    // cell = cell element object.
    select: function(cell) {
	let table = cell.parentElement.parentElement.parentElement;
	console.log("table.id = " + table.id);
	if (table.id === "supplies" && model.supSelectCellId) {
	    this.deselect(document.getElementById(model.supSelectCellId));
	}
	
	div = document.createElement("div");
	div.setAttribute("id", "selected");
	div.setAttribute("class", "selected");

	// Each cell should contain a div which all child nodes are appended to.
	cell.firstChild.appendChild(div);

	if (cell.id.startsWith("sup")) {
	    model.supSelectCellId = cell.id;
	}

    },

    // Visually deselect a cell.
    deselect: function(cell) {
	console.log("in view.deselect");
	if (cell.id.startsWith("sup")) {
	    model.supSelectCellId = undefined;
	    this.updateSupplies(model.supplies);
	}
    },

    // Remove all child nodes from an HTML node.
    removeChildren: function(parent) {
	while (parent.firstChild) {
	    parent.removeChild(parent.firstChild);
	}
    },

    displayGold: function(gp) {
	console.log("in view.displayGold");
	let txtBox = document.getElementById("goldAmt");
	txtBox.innerHTML = gp;
    },

    initMarket: function() {
	let cell = document.getElementById("market");
	cell.ondragover = dragoverHandler;
	cell.ondrop = marketDropHandler;
    },

    // Hide the tooltip for a cell.
    // Each cell starts with a div which contains an img followed by a span.
    // The span is the tooltip.
    disableTooltip: function(cell) {
	let span = cell.firstChild.children[1];
	span.setAttribute("style", "visibility: hidden;");
    }
};

let controller = {
    dropOnMarket: function(cellId, itemId) {
	let item = model.getItemById(itemId);

	if (item.type === "seed" &&
	    (item.state === "ripe" || item.state === "seed")) {
	    console.log("Sell seed");
	    model.sellItem(item);
	}
    },
    
    // Manage something being dragged and dropped onto a plot.
    // plotID = table cell ID where the item is being dropped.
    // id = ID of the item being dropped.
    dropOnPlot: function(plotId, id) {
	// Clear out the cell - this happens in view.updateField so is redundant
	// here.
	//let parent = document.getElementById(plotId);
	//view.removeChildren(parent);
	
	// Determine what's being dropped..seed, fertilizer, ?
	let item = model.getItemById(id);
	if (item.type === "seed") {
	    model.plantSeed(plotId, id);
	}
    }
};

// The nothing object is used to populate empty cells in various tables.
let nothing = {
    name: "nothing",
    id: "0"
};

// Initialize the seeds array which acts as a seed database. .copy() the seed
// from the DB before using.
function initSeeds() {
    let seeds = [];
    
    let seedData = {
	name: "Wheat",
	type: "seed",
	invImg: "seed_master.png",
	growthImg0: "sprout.png",
	ripeImg: "wheat_ripe.png",
	durationGrowth0: 1,
	durationGrowth1: 1,
	buyPrice: 1,
	sellPrice: 2
    };
    seeds.push(new Seed(seedData));

    seedData = {
	name: "Carrot",
	type: "seed",
	invImg: "seed_master.png",
	growthImg0: "sprout.png",
	ripeImg: "carrot_ripe.png",
	durationGrowth0: 2,
	durationGrowth1: 5,
	buyPrice: 5,
	sellPrice: 10
    };
    seeds.push(new Seed(seedData));

    seedData = {
	name: "Berries",
	type: "seed",
	invImg: "seed_master.png",
	growthImg0: "sprout.png",
	ripeImg: "berries_ripe.png",
	durationGrowth0: 5,
	durationGrowth1: 15,
	buyPrice: 15,
	sellPrice: 30
    };
    seeds.push(new Seed(seedData));

    seedData = {
	name: "Garlic",
	type: "seed",
	invImg: "seed_master.png",
	growthImg0: "sprout.png",
	ripeImg: "garlic_ripe.png",
	durationGrowth0: 30,
	durationGrowth1: 120,
	buyPrice: 30,
	sellPrice: 100
    };
    seeds.push(new Seed(seedData));

    return seeds;
}

function init() {
    console.log("in init");
    model.initInv();
    model.initSupplies();
    view.displayGold(model.gold);
    view.initMarket();
    model.initField();

    let b = document.getElementById("buyButton");
    b.onclick = buyButtonHandler;

    b = document.getElementById("helpButton");
    modal = document.getElementById("helpModal");
    b.onclick = function() {
	modal.style.display = "block";
    }
    close = document.getElementById("modalClose");
    close.onclick = function() {
	modal.style.display = "none";
    }
    window.onclick = function(event) {
	if (event.target == modal) {
	    modal.style.display = "none";
	}
    }
    
    setInterval(function() { model.monitorField(); }, 1000);
}

window.onload = init;
