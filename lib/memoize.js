"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.memoizeMap = memoizeMap;
exports.memoizeList = memoizeList;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function memoizeMap(fn, _ref) {
  var mapper = _ref.mapper,
      _ref$unique = _ref.unique,
      unique = _ref$unique === undefined ? false : _ref$unique,
      _ref$equalityCheck = _ref.equalityCheck,
      equalityCheck = _ref$equalityCheck === undefined ? defaultEqualityCheck : _ref$equalityCheck;

  var cache = new CacheMap(fn, mapper, unique, equalityCheck);
  return memoizeWithCache(cache, equalityCheck);
}

function memoizeList(fn, _ref2) {
  var mapper = _ref2.mapper,
      _ref2$unique = _ref2.unique,
      unique = _ref2$unique === undefined ? false : _ref2$unique,
      _ref2$equalityCheck = _ref2.equalityCheck,
      equalityCheck = _ref2$equalityCheck === undefined ? defaultEqualityCheck : _ref2$equalityCheck;

  var cache = new CacheSet(fn, mapper, unique, equalityCheck);
  return memoizeWithCache(cache, equalityCheck);
}

function defaultEqualityCheck(a, b) {
  return a === b;
}

function memoizeWithCache(cache, equalityCheck) {
  var lastInput = null;
  var lastArgs = null;
  var lastResult = null;

  return function (input) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    var argsHaveChanged = lastArgs === null || args.length !== lastArgs.length || args.some(function (arg, idx) {
      return !equalityCheck(arg, lastArgs[idx]);
    });

    if (argsHaveChanged) {
      cache.clear();
    } else if (equalityCheck(input, lastInput)) {
      return lastResult;
    }

    lastInput = input;
    lastArgs = args;
    lastResult = cache.compute(input, args);
    return lastResult;
  };
}

// CacheMap maintains a cache that maps keys to inputs and outputs. A nice
// way to think of it is as a collection of independent memoizing functions.
// The key is used to look up the memoization function

var CacheMap = function () {
  function CacheMap(fn, mapper, unique, equalityCheck) {
    _classCallCheck(this, CacheMap);

    this.fn = fn;
    this.mapper = mapper;
    this.unique = unique;
    this.equalityCheck = equalityCheck;

    this.cache = null;
  }

  _createClass(CacheMap, [{
    key: "clear",
    value: function clear() {
      this.cache = null;
    }
  }, {
    key: "compute",
    value: function compute(input, args) {
      var fn = this.fn,
          unique = this.unique,
          equalityCheck = this.equalityCheck;


      var prevCache = this.cache;
      var nextCache = new Map();

      var callback = function callback(key, value) {
        if (!unique) {
          var record = nextCache.get(key);
          if (record !== undefined) {
            return record.result;
          }
        }

        if (prevCache !== null) {
          var _record = prevCache.get(key);
          if (_record !== undefined && equalityCheck(_record.value, value)) {
            nextCache.set(key, _record);
            return _record.result;
          }
        }

        var result = fn.apply(undefined, [value, key].concat(_toConsumableArray(args)));
        nextCache.set(key, { value: value, result: result });
        return result;
      };

      var result = this.mapper(input, callback);
      this.cache = nextCache;
      return result;
    }
  }]);

  return CacheMap;
}();

// CacheSet maintains a cache that maps inputs directly to outputs. Consider
// each input as a _set_ of values. From computation to computation: all new
// elements are computed, all removed elements are dropped, and the
// intersection just stays in the cache.


var CacheSet = function () {
  function CacheSet(fn, mapper, unique, equalityCheck) {
    _classCallCheck(this, CacheSet);

    this.fn = fn;
    this.mapper = mapper;
    this.unique = unique;

    this.makemap = equalityCheck === defaultEqualityCheck ? function () {
      return new Map();
    } : function () {
      return new CustomEqualityMap(equalityCheck);
    };

    this.cache = null;
  }

  _createClass(CacheSet, [{
    key: "clear",
    value: function clear() {
      this.cache = null;
    }
  }, {
    key: "compute",
    value: function compute(input, args) {
      var fn = this.fn,
          unique = this.unique;


      var prevCache = this.cache;
      var nextCache = this.makemap();

      var callback = function callback(value) {
        if (!unique) {
          var _result = nextCache.get(value);
          if (_result !== undefined) {
            return _result;
          }
        }

        if (prevCache !== null) {
          var _result2 = prevCache.get(value);
          if (_result2 !== undefined) {
            nextCache.set(value, _result2);
            return _result2;
          }
        }

        var result = fn.apply(undefined, [value].concat(_toConsumableArray(args)));
        nextCache.set(value, result);
        return result;
      };

      var result = this.mapper(input, callback);
      this.cache = nextCache;
      return result;
    }
  }]);

  return CacheSet;
}();

// CacheSet would _ideally_ use a native map to maintain the internal mapping
// from inputs to outputs, but unfortunately you cannot use a native map when
// you have a custom equality function.
//
// CustomEqualityMap was written to replace the internal map in that exact
// situation. It's very customized for our use case, and nescessarily less
// performant than a native map, but it's the best solution I could think of,
// and common case performace shouldn't suffer much.
//
// The only notably slower things are cache misses and situations where the
// key has changed but still satisfies the equality check.


var CustomEqualityMap = function () {
  function CustomEqualityMap(equalityCheck) {
    _classCallCheck(this, CustomEqualityMap);

    this.equalityCheck = equalityCheck;
    this.map = new Map();
    this.keys = [];
  }

  _createClass(CustomEqualityMap, [{
    key: "get",
    value: function get(key) {
      // Search the internal map. Allows us to avoid doing a more expensive
      // lookup when the key satisfies native equality, likely the common case.
      var value = this.map.get(key);
      if (value !== undefined) {
        return value;
      }

      // Linearly search through all keys.
      var keys = this.keys,
          equalityCheck = this.equalityCheck;

      for (var i = 0; i < keys.length; i++) {
        if (equalityCheck(key, keys[i])) {
          value = this.map.get(keys[i]);
          this.map.set(key, value);
          return value;
        }
      }
      return undefined;
    }
  }, {
    key: "set",
    value: function set(key, value) {
      // This will only be called when the key does not exist, so we can avoid
      // doing an existence check.
      this.map.set(key, value);
      this.keys.push(key);
    }
  }]);

  return CustomEqualityMap;
}();