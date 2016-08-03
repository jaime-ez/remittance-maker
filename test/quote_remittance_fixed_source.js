'use strict'

var Maker = require('../')
var assert = require('chai').assert
var errorFixture = require('./fixtures/quote_remittance_fixed_source').error
var success = require('./fixtures/quote_remittance_fixed_source').success
var orders = require('./fixtures/quote_remittance_fixed_source').orders()
var ordersError = require('./fixtures/quote_remittance_fixed_source').ordersError()
var async = require('async')

describe('Remittance Maker Quote Remittance Fixed Source', function () {
  async.eachSeries(orders, function (order, cb) {
    it('should get quote for order ' + JSON.stringify(order), function (done) {
      var maker = new Maker({})
      maker.quoteRemittanceFixedSource(order, function (error, response) {
        assert(!error)
        assert(response)
        assert.deepEqual(success(response), response)
        done()
      })
    })
    cb()
  })

  async.eachSeries(ordersError, function (order, cb) {
    it('should fail to get quote for order ' + JSON.stringify(order), function (done) {
      var maker = new Maker({})
      maker.quoteRemittanceFixedSource(order, function (error, response) {
        assert(error)
        assert(!response)
        assert.deepEqual(errorFixture(error), error)
        done()
      })
    })
    cb()
  })
})
