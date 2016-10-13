'use strict'

var async = require('async')
var _ = require('lodash')
require('bitcoin-math')
var SurbtcRestClient = require('surbtc-rest-client')

function Maker (options) {
  this.apiKey = options.apiKey || 'a061fc555331d1285a89b012676d6e7c'
  this.apiUrl = options.apiUrl || 'https://stg.surbtc.com/api/v1'
  this.bridgeCurrency = options.bridgeCurrency || 'BTC'
  this.sourceCurrencyDepositFee = options.sourceCurrencyDepositFee || 0
  this.destinationCurrencyWithdrawalFee = options.destinationCurrencyWithdrawalFee || 0.01
  this.dinexFee = options.dinexFee || 0.02
  this.btcInsurance = options.btcInsurance || 0.015
}

Maker.prototype._calculateQuotationFixedSource = function (options, callback) {
  var self = this

  var sourceAmountNoFees = options.sourceAmount
  var destinationAmountNoFees = _.toNumber(options.quotation.quote_balance_change[0])
  var destinationAmountToBeReceived = destinationAmountNoFees * (1 - self.destinationCurrencyWithdrawalFee)
  var marketExchangeRate = destinationAmountNoFees / sourceAmountNoFees
  var sourceCurrencyDepositFeeAmount = sourceAmountNoFees * self.sourceCurrencyDepositFee
  var dinexFeeTotalAmount = (sourceAmountNoFees - sourceCurrencyDepositFeeAmount) * self.dinexFee
  var btcToBuy = _.toNumber(options.reverseQuotation.order_amount[0])

  var result = {
    quotation: options.quotation,
    reverseQuotation: options.reverseQuotation,
    marketExchangeRate: marketExchangeRate,
    sourceAmount: options.sourceAmount,
    sourceCurrency: options.sourceCurrency,
    sourceCurrencyDepositFeeAmount: sourceCurrencyDepositFeeAmount,
    dinexFeeTotalAmount: _.round(dinexFeeTotalAmount),
    sourceAmountToBeDeposited: _.round(sourceAmountNoFees / ((1 - self.dinexFee) * (1 - self.sourceCurrencyDepositFee))),
    destinationCurrency: options.destinationCurrency,
    destinationAmountNoFees: destinationAmountNoFees,
    destinationAmountToBeReceived: _.round(destinationAmountToBeReceived, 2),
    btcToBuy: btcToBuy
  }

  return callback(null, {success: true, quotation: result})
}

Maker.prototype._calculateQuotationFixedDestination = function (options, callback) {
  var self = this

  var sourceAmountNoFees = _.toNumber(options.quotation.quote_balance_change[0]) * (-1)
  var destinationAmountNoFees = options.reverseQuotation.quote_balance_change[0]
  var destinationAmountToBeReceived = options.destinationAmount * (1 - self.destinationCurrencyWithdrawalFee)
  var marketExchangeRate = destinationAmountNoFees / sourceAmountNoFees
  var sourceAmountPlusDepositFee = sourceAmountNoFees / (1 - self.sourceCurrencyDepositFee)
  var sourceAmountPlusDepositFeeAndDinexFee = sourceAmountPlusDepositFee / (1 - self.dinexFee)
  var dinexFeeTotalAmount = _.toInteger(sourceAmountPlusDepositFeeAndDinexFee - sourceAmountPlusDepositFee)
  var sourceCurrencyDepositFeeAmount = _.toInteger(sourceAmountPlusDepositFee - sourceAmountNoFees)
  var btcToBuy = _.toNumber(options.reverseQuotation.order_amount[0])

  var result = {
    quotation: options.quotation,
    reverseQuotation: options.reverseQuotation,
    marketExchangeRate: marketExchangeRate,
    sourceAmount: sourceAmountNoFees,
    sourceCurrency: options.sourceCurrency,
    sourceCurrencyDepositFeeAmount: sourceCurrencyDepositFeeAmount,
    sourceAmountPlusDepositFee: sourceAmountPlusDepositFee,
    dinexFeeTotalAmount: _.round(dinexFeeTotalAmount),
    sourceAmountToBeDeposited: _.round(sourceAmountPlusDepositFeeAndDinexFee),
    destinationCurrency: options.destinationCurrency,
    destinationAmountNoFees: destinationAmountNoFees,
    destinationAmountToBeReceived: _.round(destinationAmountToBeReceived, 2),
    btcToBuy: btcToBuy
  }

  return callback(null, {success: true, quotation: result})
}

Maker.prototype.quoteRemittanceFixedSource = function (options, callback) {
  var self = this

  var client = new SurbtcRestClient({
    api: self.apiUrl,
    secret: self.apiKey
  })

  if (!options.sourceCurrency) {
    return callback({success: false, error_type: 'sourceCurrency_required', statusCode: 400}, null)
  }

  if (!(options.sourceAmount && _.isFinite(options.sourceAmount))) {
    return callback({success: false, error_type: 'sourceAmount_invalid', statusCode: 400}, null)
  }

  if (options.sourceCurrency === 'CLP') {
    var marketId = 'BTC-CLP'
    var type = 'Bid'
    var reverseMarket = 'BTC-COP'
    var reverseType = 'Ask'
    // convert source amount to amount minus dinex fee
    options.sourceAmount = _.toInteger(options.sourceAmount) * (1 - self.sourceCurrencyDepositFee) * (1 - self.dinexFee)
    // set destination currency
    options.destinationCurrency = 'COP'
    // get exchange fee
    async.waterfall([
      function (next) {
        client.getReverseQuotation(marketId, type, options.sourceAmount, next)
      },
      function (reverseQuotation, next) {
        options.reverseQuotation = reverseQuotation.quotation
        options.reverseQuotationAmountPlusInsurance = _.toNumber(options.reverseQuotation.base_balance_change[0]) * (1 - self.btcInsurance)
        client.getQuotation(reverseMarket, reverseType, options.reverseQuotationAmountPlusInsurance, next)
      },
      function (quotation, next) {
        options.quotation = quotation.quotation
        self._calculateQuotationFixedSource(options, next)
      }
    ], callback)
  } else {
    return callback({success: false, error_type: 'sourceCurrency_invalid', statusCode: 400}, null)
  }
}

Maker.prototype.quoteRemittanceFixedDestination = function (options, callback) {
  var self = this

  var client = new SurbtcRestClient({
    api: self.apiUrl,
    secret: self.apiKey
  })

  if (!options.destinationCurrency) {
    return callback({success: false, error_type: 'destinationCurrency_required', statusCode: 400}, null)
  }

  if (!(options.destinationAmount && _.isFinite(options.destinationAmount))) {
    return callback({success: false, error_type: 'destinationAmount_invalid', statusCode: 400}, null)
  }

  if (options.destinationCurrency === 'COP') {
    var marketId = 'BTC-COP'
    var type = 'Ask'
    var reverseMarket = 'BTC-CLP'
    var reverseType = 'Bid'
    // force destinationAmount as number
    options.destinationAmount = _.toNumber(options.destinationAmount)
    // include withdrawal fee
    options.destinationAmount = options.destinationAmount / (1 - self.destinationCurrencyWithdrawalFee)
    // set source currency
    options.sourceCurrency = 'CLP'
    // get exchange fee
    async.waterfall([
      function (next) {
        client.getReverseQuotation(marketId, type, options.destinationAmount, next)
      },
      function (reverseQuotation, next) {
        options.reverseQuotation = reverseQuotation.quotation
        options.reverseQuotationAmountPlusInsurance = _.toNumber(options.reverseQuotation.base_balance_change[0]) / (self.btcInsurance - 1)
        client.getQuotation(reverseMarket, reverseType, options.reverseQuotationAmountPlusInsurance, next)
      },
      function (quotation, next) {
        options.quotation = quotation.quotation
        self._calculateQuotationFixedDestination(options, next)
      }
    ], callback)
  } else {
    return callback({success: false, error_type: 'destinationCurrency_invalid', statusCode: 400}, null)
  }
}

Maker.prototype._getBalance = function (currency, expected, callback, loopFunction) {
  var self = this

  var client = new SurbtcRestClient({
    api: self.apiUrl,
    secret: self.apiKey
  })

  client.getBalances(currency, function (error, response) {
    if (error) {
      return callback(error, null)
    } else {
      if (_.toNumber(response.balance.available_amount) >= _.toNumber(expected)) {
        callback(null, response)
      } else {
        setTimeout(function () {
          loopFunction(currency, expected, callback, loopFunction)
        }, 500)
      }
    }
  })
}

Maker.prototype._pollBalance = function (currency, expected, callback) {
  var self = this

  self._getBalance(currency, expected, callback,
    self._getBalance.bind(this))
}

Maker.prototype.executeRemittance = function (options, callback) {
  var self = this

  var client = new SurbtcRestClient({
    api: self.apiUrl,
    secret: self.apiKey
  })

  if (!(options.btcAmount && _.isFinite(options.btcAmount))) {
    return callback({success: false, error_type: 'btcAmount_invalid', statusCode: 400}, null)
  }

  if (!options.destinationCurrency) {
    return callback({success: false, error_type: 'destinationCurrency_required', statusCode: 400}, null)
  }

  if (options.destinationCurrency === 'COP') {
    // market buy of BTC
    // convert btcAmount to satoshis
    var amnt = options.btcAmount.toSatoshi()
    var buyOrder = {
      type: 'bid',
      limit: null,
      amount: amnt,
      price_type: 'market'
    }

    // market sell of BTC
    var sellOrder = {
      type: 'ask',
      limit: null,
      amount: null,
      price_type: 'market'
    }

    async.waterfall([
      function (next) {
        // first we check that we have enough balance to completely fill the order
        // watch out that quotations are in BTC, CLP and orders in Satoshis, centsCLP
        client.getQuotation('btc-clp', 'bid', options.btcAmount, function (err, resQuote) {
          if (err) {
            return callback({success: false, error: err, statusCode: 500}, null)
          } else {
            client.getBalances('clp', function (err, resBalance) {
              if (err) {
                return callback({success: false, error: err, statusCode: 500}, null)
              } else {
                if (resBalance.balance.available_amount / 100 > resQuote.quotation.quote_balance_change[0] * (-1)) {
                  next()
                } else {
                  return callback({success: false, error: 'insufficient CLP balance on Dinex master account', statusCode: 400}, null)
                }
              }
            })
          }
        })
      },
      function (next) {
        client.createAndTradeOrder('btc-clp', buyOrder, function (err, res) {
          if (err) {
            return callback({success: false, error: err, statusCode: 500}, null)
          } else {
            // set sellOrder.amount based on res
            sellOrder.amount = _.toNumber(res.order.traded_amount) - _.toNumber(res.order.paid_fee)
            // store res
            buyOrder.tradedOrder = res.order
            next()
          }
        })
      },
      function (next) {
        // wait untill balance is available
        self._pollBalance('btc', sellOrder.amount, function (er, balance) {
          if (er) {
            callback({success: false, error: er, statusCode: 500}, null)
          } else {
            client.createAndTradeOrder('btc-cop', sellOrder, function (err, res) {
              if (err) {
                // sell back??
                callback({success: false, error: err, statusCode: 500}, null)
              } else {
                // store res
                sellOrder.tradedOrder = res.order
                callback(null, {success: true, buyOrder: buyOrder, sellOrder: sellOrder, statusCode: 200})
              }
            })
          }
        })
      }
    ], callback)
  } else {
    return callback({success: false, error_type: 'destinationCurrency_invalid', statusCode: 400}, null)
  }
}

module.exports = Maker
