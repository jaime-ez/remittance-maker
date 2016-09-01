'use strict'

var async = require('async')
var _ = require('lodash')
var SurbtcRestClient = require('surbtc-rest-client')

function Maker (options) {
  this.apiKey = '' || 'a061fc555331d1285a89b012676d6e7c'
  this.apiUrl = '' || 'https://stg.surbtc.com/api/v1'
  this.bridgeCurrency = options.bridgeCurrency || 'BTC'
  this.sourceCurrencyDepositFee = options.sourceCurrencyDepositFee || 0
  this.destinationCurrencyWithdrawalFee = options.destinationCurrencyWithdrawalFee || 0.01
  this.dinexFee = options.dinexFee || 0.02
  this.btcInsurance = options.btcInsurance || 0.015
}

Maker.prototype._calculateQuotationFixedSource = function (options, callback) {
  var self = this

  var marketExchangeRate = (options.reverseQuotationTotalMinusExchangeFee / options.sourceAmountCents)
  var marketExchangerateActual = marketExchangeRate * (1 - self.btcInsurance)
  var destinationAmountNoFees = _.toInteger(options.sourceAmount * marketExchangerateActual)
  var dinexFeeTotalAmount = _.toInteger(options.sourceAmount * self.dinexFee)
  var sourceCurrencyDepositFeeAmount = _.toInteger(options.sourceAmount * self.sourceCurrencyDepositFee)
  var destinationAmontMinusDinexFee = _.toInteger(options.sourceAmount * (1 - self.dinexFee) * marketExchangerateActual)
  var destinationAmountMinusDinexFeeAndDepositFee = _.toInteger(options.sourceAmount * (1 - self.dinexFee) * (1 - self.sourceCurrencyDepositFee) * marketExchangerateActual)
  var destinationCurrencyWithdrawalFeeAmount = _.toInteger(options.sourceAmount * (1 - self.dinexFee) * (1 - self.sourceCurrencyDepositFee) * marketExchangerateActual * self.destinationCurrencyWithdrawalFee)
  var destinationAmountMinusDinexFeeAndDepositFeeAndWithdrawalFee = _.toInteger(options.sourceAmount * (1 - self.dinexFee) * (1 - self.sourceCurrencyDepositFee) * (1 - self.destinationCurrencyWithdrawalFee) * marketExchangerateActual)

  var result = {
    quotation: options.quotationAmountMinusExchangeFee,
    reverseQuotation: options.reverseQuotationTotalMinusExchangeFee,
    marketExchangeRate: marketExchangeRate,
    marketExchangerateActual: marketExchangerateActual,
    sourceAmount: options.sourceAmount,
    sourceCurrencyDepositFeeAmount: sourceCurrencyDepositFeeAmount,
    dinexFeeTotalAmount: dinexFeeTotalAmount,
    destinationCurrencyWithdrawalFeeAmount: destinationCurrencyWithdrawalFeeAmount,
    destinationAmountNoFees: destinationAmountNoFees,
    destinationAmontMinusDinexFee: destinationAmontMinusDinexFee,
    destinationAmountMinusDinexFeeAndDepositFee: destinationAmountMinusDinexFeeAndDepositFee,
    destinationAmountMinusDinexFeeAndDepositFeeAndWithdrawalFee: destinationAmountMinusDinexFeeAndDepositFeeAndWithdrawalFee
  }

  return callback(null, {success: true, quotation: result})
}

Maker.prototype._calculateQuotationFixedDestination = function (options, callback) {
  var self = this

  var sourceAmountNoFees = _.toNumber(options.quotation.quote_balance_change[0]) * (-1)
  var marketExchangeRate = options.destinationAmount / sourceAmountNoFees
  var sourceAmountPlusDepositFee = sourceAmountNoFees / (1 - self.sourceCurrencyDepositFee)
  var sourceAmountPlusDepositFeeAndDinexFee = _.toInteger(sourceAmountPlusDepositFee / (1 - self.dinexFee))
  var dinexFeeTotalAmount = _.toInteger(sourceAmountPlusDepositFeeAndDinexFee - sourceAmountPlusDepositFee)
  var sourceCurrencyDepositFeeAmount = _.toInteger(sourceAmountPlusDepositFee - sourceAmountNoFees)

  var result = {
    quotation: options.quotation,
    reverseQuotation: options.reverseQuotation,
    marketExchangeRate: marketExchangeRate,
    sourceAmount: sourceAmountNoFees,
    sourceCurrency: options.sourceCurrency,
    sourceCurrencyDepositFeeAmount: sourceCurrencyDepositFeeAmount,
    sourceAmountPlusDepositFee: sourceAmountPlusDepositFee,
    dinexFeeTotalAmount: dinexFeeTotalAmount,
    sourceAmountPlusDepositFeeAndDinexFee: sourceAmountPlusDepositFeeAndDinexFee,
    sourceAmountToBeDeposited: sourceAmountPlusDepositFeeAndDinexFee,
    destinationCurrency: options.destinationCurrency,
    destinationAmountPlusWithdrawalFee: options.destinationAmount,
    destinationAmount: options.destinationAmount * (1 - self.destinationCurrencyWithdrawalFee)
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
    // convert source amount to cents
    options.sourceAmountCents = _.toInteger(options.sourceAmount) * 100
    // get exchange fee
    async.waterfall([
      function (next) {
        client.getExchangeFee(marketId, type, next)
      },
      function (exchangeFeeQuote, next) {
        options.exchangeFeeQuote = _.toNumber(exchangeFeeQuote.fee_percentage.value) / 100
        client.getExchangeFee(reverseMarket, reverseType, next)
      },
      function (exchangeFeeReverseQuote, next) {
        options.exchangeFeeReverseQuote = _.toNumber(exchangeFeeReverseQuote.fee_percentage.value) / 100
        client.getQuotation(marketId, type, options.sourceAmountCents, next)
      },
      function (quotation, next) {
        options.quotation = quotation.quotation
        options.quotationAmountMinusExchangeFee = _.toNumber(options.quotation.amount) * (1 - options.exchangeFeeQuote)
        client.getReverseQuotation(reverseMarket, reverseType, options.quotationAmountMinusExchangeFee, next)
      },
      function (reverseQuotation, next) {
        options.reverseQuotation = reverseQuotation.reverse_quotation
        options.reverseQuotationTotalMinusExchangeFee = _.toNumber(options.reverseQuotation.total) * (1 - options.exchangeFeeReverseQuote)
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
        client.getExchangeFee(marketId, type, next)
      },
      function (exchangeFeeQuote, next) {
        options.exchangeFeeQuote = _.toNumber(exchangeFeeQuote.fee_percentage.value) / 100
        client.getExchangeFee(reverseMarket, reverseType, next)
      },
      function (exchangeFeeReverseQuote, next) {
        options.exchangeFeeReverseQuote = _.toNumber(exchangeFeeReverseQuote.fee_percentage.value) / 100
        client.getReverseQuotation(marketId, type, options.destinationAmount, next)
      },
      function (reverseQuotation, next) {
        options.reverseQuotation = reverseQuotation.quotation
        options.reverseQuotationAmountPlusInsurance = _.toNumber(options.reverseQuotation.order_amount[0]) / (1 - self.btcInsurance)
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

module.exports = Maker
