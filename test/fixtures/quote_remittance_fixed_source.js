'use strict'

exports.success = function (args) {
  return {
    success: true,
    quotation: {
      quotation: args.quotation.quotation,
      reverseQuotation: args.quotation.reverseQuotation,
      marketExchangeRate: args.quotation.marketExchangeRate,
      marketExchangerateActual: args.quotation.marketExchangerateActual,
      sourceAmount: args.quotation.sourceAmount,
      sourceCurrencyDepositFeeAmount: args.quotation.sourceCurrencyDepositFeeAmount,
      dinexFeeTotalAmount: args.quotation.dinexFeeTotalAmount,
      destinationCurrencyWithdrawalFeeAmount: args.quotation.destinationCurrencyWithdrawalFeeAmount,
      destinationAmountNoFees: args.quotation.destinationAmountNoFees,
      destinationAmontMinusDinexFee: args.quotation.destinationAmontMinusDinexFee,
      destinationAmountMinusDinexFeeAndDepositFee: args.quotation.destinationAmountMinusDinexFeeAndDepositFee,
      destinationAmountMinusDinexFeeAndDepositFeeAndWithdrawalFee: args.quotation.destinationAmountMinusDinexFeeAndDepositFeeAndWithdrawalFee
    }
  }
}

exports.error = function (args) {
  return {
    success: false,
    error_type: args.error_type
  }
}

exports.orders = function () {
  return [
    {
      sourceCurrency: 'CLP',
      sourceAmount: 10000
    }
  ]
}

exports.ordersError = function () {
  return [
    {
      sourceCurrency: 'CXP',
      sourceAmount: 10000
    }
  ]
}
