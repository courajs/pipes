Array.prototype.random_index = function(){
		var index = Math.floor( Math.random() * this.length);
		if (index === this.length)
			index -= 1;
		return index;
	}


Array.prototype.random = function(){
	var index = this.random_index();
	return this[index];
}

function Cell(x, y, board){
	this.x = x;
	this.y = y;
	this.board = board;
	this.connections = {};
	this.plumbed = false;
	this.filled = false;

	this.view = new CellView(this);
}

Cell.prototype.render = function(){
	var self = this;
	var type = determine_piece_type(this.connections);
	var rotation = determine_rotation(type, this.connections);
	var img_src = type;
	if (this.filled)
		img_src += '_green';
	this.view.set_inner_image(img_src);
	this.view.rotate(rotation);

	function determine_piece_type(){
		var cons = self.connections;
		var num_connections = !!cons.left + !!cons.top + !!cons.right + !!cons.bottom;
		if (num_connections === 0)
			return '0';
		if (num_connections === 1)
			return '1';
		if (num_connections === 3)
			return 'T';
		if (num_connections === 4)
			return '+';
		if (cons.left && cons.right || cons.top && cons.bottom)
			return 'I';
		return 'L';
	}

	function determine_rotation(piece_type){
		var cons = self.connections;
		switch (piece_type) {
			case '0':
				return 0;
			case '1':
				return determine_1_rotation(cons);
			case 'I':
				return determine_i_rotation(cons);
			case 'L':
				return determine_l_rotation(cons);
			case 'T':
				return determine_t_rotation(cons);
			case '+':
				return 0;
		}

		function determine_1_rotation(cons){
			if (cons.right)
				return 90;
			if (cons.bottom)
				return 180;
			if (cons.left)
				return 270;
			return 0;
		}
		function determine_i_rotation(cons){
			if (cons.right)
				return 90;
			return 0;
		}
		function determine_l_rotation(cons){
			if (cons.right && cons.bottom)
				return 90;
			if (cons.bottom && cons.left)
				return 180;
			if (cons.left && cons.top)
				return 270;
			return 0;
		}

		function determine_t_rotation(cons){
			if (!cons.top)
				return 90;
			if (!cons.right)
				return 180;
			if (!cons.bottom)
				return 270;
			return 0;
		}
	}

}

Cell.prototype.rotate = function(){
	var cons = this.connections;
	var newcons = this.connections = {};

	if(cons.top)
		newcons.right = this.to_the_right();
	if(cons.right)
		newcons.bottom = this.below();
	if(cons.bottom)
		newcons.left = this.to_the_left();
	if(cons.left)
		newcons.top = this.above();
	this.render();
}

Cell.prototype.above = function() {
	return this.relative_cell(0, -1);
};
Cell.prototype.below = function() {
	return this.relative_cell(0, 1);
};
Cell.prototype.to_the_right = function() {
	return this.relative_cell(1, 0);
};
Cell.prototype.to_the_left = function() {
	return this.relative_cell(-1, 0);
};
Cell.prototype.relative_cell = function(x, y) {
	new_x = this.x + x;
	new_y = this.y + y;
	if (this.board.cells[new_x] && this.board.cells[new_x][new_y])
		return this.board.cells[new_x][new_y];
	return true;
};

Cell.prototype.neighbors = function() {
	var cells = this.board.cells;
	var x = this.x;
	var y = this.y;
	result = [ cells[x][y-1], cells[x][y+1] ];
	if (cells[x-1])
		result.push(cells[x-1][y]);
	if (cells[x+1])
		result.push(cells[x+1][y]);
	result = result.filter(function(item){
		return item;
	});
	return result;
};

Cell.prototype.connected_neighbors = function() {
	var cons = this.connections;
	var result = [];
	if(cons.top && cons.top.connections && cons.top.connections.bottom)
		result.push(cons.top);
	if(cons.right && cons.right.connections && cons.right.connections.left)
		result.push(cons.right);
	if(cons.bottom && cons.bottom.connections && cons.bottom.connections.top)
		result.push(cons.bottom);
	if(cons.left && cons.left.connections && cons.left.connections.right)
		result.push(cons.left);
	return result;
};


Cell.prototype.plumb = function(){
	var neighbors = this.neighbors();
	var plumbed_neighbors = neighbors.filter(function(item){
		return item.plumbed;
	});
	var target = plumbed_neighbors.random();
	if (!target)
		throw new Error('whoah can\'t plumb there');
	connect(this, target);
	this.plumbed = true;
	this.render();
	target.render();


	function connect(a, b){
		var dx = a.x - b.x;
		var dy = a.y - b.y;
		if (dx === 1 && dy === 0){
			a.connections.left = b;
			b.connections.right = a;
		}
		else if (dx === -1 && dy === 0){
			a.connections.right = b;
			b.connections.left = a;
		}
		else if (dx === 0 && dy === 1){
			a.connections.top = b;
			b.connections.bottom = a;
		}
		else if (dx === 0 && dy === -1){
			a.connections.bottom = b;
			b.connections.top = a;
		}
		else {
			throw new Error('whoa, can\'t connect those two cells');
		}
	}
}

Cell.prototype.fill = function() {
	if (this.filled) return 0;
	this.filled = true;
	var fill_nums = this.connected_neighbors().map(function(cell){
		var result = cell.fill();
		cell.render();
		return result;
	});
	return fill_nums.reduce(function(a,b){return a+b}, 1);
};

Cell.prototype.taxi_distance = function() {
	return Math.abs(this.x - 4) + Math.abs(this.y - 4);
};




function CellView(cell){
	var self = this;
	this.cell = cell;
	this.el = create_and_insert_div();

	this.el.onclick = function(){
		self.cell.rotate();
		board.refill();
	}

	function create_and_insert_div(){
		var div = document.createElement('div');
		div.className = 'cell';
		var game = document.getElementById('game');
		game.appendChild(div);
		return div;
	}

}

CellView.prototype.set_inner_image = function(image_name){
	var image_path = 'img/' + image_name + '.png';
	var img_html = '<img src="' + image_path + '""></img>';
	this.el.innerHTML = img_html;
}

CellView.prototype.rotate = function(angle){
	this.angle = angle;
	var transform = 'rotate(' + this.angle + 'deg)'
	this.el.style.webkitTransform = transform;
}


function Board(){
	var cells = this.cells = [];

	for (var column = 0; column < 9; column++){
		cells[column] = [];
	}

	for (var y = 0; y < 9; y++){
		for (var x = 0; x < 9; x++){
			cells[x][y] = new Cell(x, y, this);
		}
	}

	cells[4][4].plumbed = true;
	cells[4][4].render();

	var unplumbed_cells = [cells[3][4], cells[5][4], cells[4][3], cells[4][5]];

	while (unplumbed_cells.length){
		var index = unplumbed_cells.random_index();
		var cell_to_plumb = unplumbed_cells.splice(index, 1)[0];
		cell_to_plumb.plumb();
		var new_unplumbed = cell_to_plumb.neighbors().filter(function(item){
			return !item.plumbed;
		});
		
		for (var i = 0; i < new_unplumbed.length; i++){
			cell = new_unplumbed[i];
			if (! (unplumbed_cells.indexOf(cell) + 1))
				unplumbed_cells.push(cell);
		}
		unplumbed_cells.sort(function(a, b){
			return a.taxi_distance() - b.taxi_distance();
		})

	}


	for (var y = 0; y < 9; y++){
		for (var x = 0; x < 9; x++){
			var num_rotations = [0,1,2,3].random();
			for (var i = 0; i < num_rotations; i++)
				cells[x][y].rotate();
		}
	}

	cells[4][4].fill();

}

Board.prototype.refill = function() {
	for(var y = 0; y <9; y++){
		for(var x=0; x<9; x++){
			this.cells[x][y].filled = false;
			this.cells[x][y].render();
		}
	}
	if (this.cells[4][4].fill() === 81)
		victory();
};



function victory(){
	alert('you win!');
}

board = new Board();
