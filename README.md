# remittance-maker  

This module connects to the [surbtc bitcoin exchange](https://www.surbtc.com) in order to quote and execute remittances.  

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)  

## Installation  

npm install remittance-maker  
bower install remittance-maker  

### Usage  

#### Nodejs  

    var RemittanceMaker = require("remittance-maker").Maker  

    var maker = new RemittanceMaker({})  

#### Browser  

    var maker = new Maker({})

### Primary functions  

#### quote Remittance Fixed Source  

Gives a quote for a remittance based on a fixed origin currency and amount  

    var options = {
      sourceCurrency: '',
      sourceAmount: ''
    }

    maker.quoteRemittanceFixedSource(options, function(err, res){

    })  


#### quote Remittance Fixed Destination  

Gives a quote for a remittance based on a fixed destination currency and amount  

    var options = {
      destinationCurrency: '',
      destinationAmount: ''
    }

    maker.quoteRemittanceFixedDestination(options, function(err, res){

    })  

#### executeRemittance  

Executes a remittance  

    var options = {
      sourceCurrency: '',
      sourceAmount: '',
      destinationCurrency: '',
      destinationAmunt: ''
    }

    maker.executeRemittance(options, function(err, res){

    })      
