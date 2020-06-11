module.exports = {
	name: 'calc',
	description: 'calc',
	execute(message, args) {
		if (message.author.id == "132287419117600768") {
			if (args[0] !== 'p')
				calc(message, args)
			else
				pointscost(message, args)
		}
	},
};

var Decimal = require('decimal.js')
Decimal.set({ precision: 40, rounding: 1 })

function calc(message, args){
	_amount = new Decimal(args[0]).sub(250)
	_pointBuy = new Decimal(0)
	_total = new Decimal(250)
	zeroOne = new Decimal(0.1)
	_int = 0
	let _skew = 0.000
	
	while (_amount.greaterThan(0)) {
		_pointBuy = Decimal(-1).dividedBy(_int - 20000).times(0.005).times(_int*_int*_int).plus(zeroOne.times(_int))
		_amount = _amount.sub(_pointBuy)
		_skew += 0.001
		_int += 1
		_total = _total.plus(_pointBuy)
	}

	_skew = (_skew).toFixed(3)
	message.channel.send(`Skew: ${_skew}\nNext point at ${_total} value`)
}

function pointscost(message, args) {
	_points = args[1]
	_pointBuy = new Decimal(0)
	_total = new Decimal(250)
	zeroOne = new Decimal(0.1)
	
	for (x = 0; x <= _points; x++) {
		_pointBuy = Decimal(-1).dividedBy(x - 20000).times(0.005).times(x*x*x).plus(zeroOne.times(x))
		_total = _total.plus(_pointBuy)
	}
	
	message.channel.send(`Cost: ${_total}`)
}
