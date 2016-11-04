'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createMapSelector = exports.createListSelector = exports.createObjectSelector = exports.createArraySelector = exports.mapMemoize = exports.listMemoize = exports.objectMemoize = exports.arrayMemoize = undefined;

var _reselect = require('reselect');

var _memoize = require('./memoize');

var arrayMemoize = exports.arrayMemoize = function arrayMemoize(fn, equalityCheck) {
  return (0, _memoize.memoizeList)(fn, {
    equalityCheck: equalityCheck,
    mapper: function mapper(arr, callback) {
      var result = [];
      for (var i = 0; i < arr.length; i++) {
        result[i] = callback(arr[i]);
      }
      return result;
    }
  });
};

var objectMemoize = exports.objectMemoize = function objectMemoize(fn, equalityCheck) {
  return (0, _memoize.memoizeMap)(fn, {
    equalityCheck: equalityCheck,
    unique: true,
    mapper: function mapper(obj, callback) {
      var result = {};
      Object.keys(obj).forEach(function (key) {
        result[key] = callback(key, obj[key]);
      });
      return result;
    }
  });
};

var listMemoize = exports.listMemoize = function listMemoize(fn, equalityCheck) {
  return (0, _memoize.memoizeList)(fn, {
    equalityCheck: equalityCheck,
    mapper: function mapper(mapable, callback) {
      return mapable.map(callback);
    }
  });
};

var mapMemoize = exports.mapMemoize = function mapMemoize(fn, equalityCheck) {
  return (0, _memoize.memoizeMap)(fn, {
    equalityCheck: equalityCheck,
    mapper: function mapper(mapable, callback) {
      return mapable.map(function (v, k) {
        return callback(k, v);
      });
    }
  });
};

var createArraySelector = exports.createArraySelector = (0, _reselect.createSelectorCreator)(arrayMemoize);
var createObjectSelector = exports.createObjectSelector = (0, _reselect.createSelectorCreator)(objectMemoize);
var createListSelector = exports.createListSelector = (0, _reselect.createSelectorCreator)(listMemoize);
var createMapSelector = exports.createMapSelector = (0, _reselect.createSelectorCreator)(mapMemoize);