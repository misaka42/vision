(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Game = factory());
}(this, (function () { 'use strict';

function h(name, props) {
  var node;
  var rest = [];
  var children = [];
  var length = arguments.length;

  while (length-- > 2) rest.push(arguments[length]);

  while (rest.length) {
    if (Array.isArray((node = rest.pop()))) {
      for (length = node.length; length--; ) {
        rest.push(node[length]);
      }
    } else if (node != null && node !== true && node !== false) {
      children.push(node);
    }
  }

  return typeof name === "function"
    ? name(props || {}, children)
    : {
        name: name,
        props: props || {},
        children: children
      }
}

function app(state, actions, view, container) {
  var renderLock;
  var invokeLaterStack = [];
  var rootElement = (container && container.children[0]) || null;
  var lastNode = rootElement && toVNode(rootElement, [].map);
  var globalState = copy(state);
  var wiredActions = copy(actions);

  scheduleRender(wireStateToActions([], globalState, wiredActions));

  return wiredActions

  function toVNode(element, map) {
    return {
      name: element.nodeName.toLowerCase(),
      props: {},
      children: map.call(element.childNodes, function(element) {
        return element.nodeType === 3
          ? element.nodeValue
          : toVNode(element, map)
      })
    }
  }

  function render() {
    renderLock = !renderLock;

    var next = view(globalState, wiredActions);
    if (container && !renderLock) {
      rootElement = patch(container, rootElement, lastNode, (lastNode = next));
    }

    while ((next = invokeLaterStack.pop())) next();
  }

  function scheduleRender() {
    if (!renderLock) {
      renderLock = !renderLock;
      setTimeout(render);
    }
  }

  function copy(target, source) {
    var obj = {};

    for (var i in target) obj[i] = target[i];
    for (var i in source) obj[i] = source[i];

    return obj
  }

  function set(path, value, source) {
    var target = {};
    if (path.length) {
      target[path[0]] =
        path.length > 1 ? set(path.slice(1), value, source[path[0]]) : value;
      return copy(source, target)
    }
    return value
  }

  function get(path, source) {
    for (var i = 0; i < path.length; i++) {
      source = source[path[i]];
    }
    return source
  }

  function wireStateToActions(path, state, actions) {
    for (var key in actions) {
      typeof actions[key] === "function"
        ? (function(key, action) {
            actions[key] = function(data) {
              if (typeof (data = action(data)) === "function") {
                data = data(get(path, globalState), actions);
              }

              if (
                data &&
                data !== (state = get(path, globalState)) &&
                !data.then // Promise
              ) {
                scheduleRender(
                  (globalState = set(path, copy(state, data), globalState))
                );
              }

              return data
            };
          })(key, actions[key])
        : wireStateToActions(
            path.concat(key),
            (state[key] = state[key] || {}),
            (actions[key] = copy(actions[key]))
          );
    }
  }

  function getKey(node) {
    return node && node.props ? node.props.key : null
  }

  function setElementProp(element, name, value, isSVG, oldValue) {
    if (name === "key") {
    } else if (name === "style") {
      for (var i in copy(oldValue, value)) {
        element[name][i] = value == null || value[i] == null ? "" : value[i];
      }
    } else {
      if (typeof value === "function" || (name in element && !isSVG)) {
        element[name] = value == null ? "" : value;
      } else if (value != null && value !== false) {
        element.setAttribute(name, value);
      }

      if (value == null || value === false) {
        element.removeAttribute(name);
      }
    }
  }

  function createElement(node, isSVG) {
    var element =
      typeof node === "string" || typeof node === "number"
        ? document.createTextNode(node)
        : (isSVG = isSVG || node.name === "svg")
          ? document.createElementNS("http://www.w3.org/2000/svg", node.name)
          : document.createElement(node.name);

    if (node.props) {
      if (node.props.oncreate) {
        invokeLaterStack.push(function() {
          node.props.oncreate(element);
        });
      }

      for (var i = 0; i < node.children.length; i++) {
        element.appendChild(createElement(node.children[i], isSVG));
      }

      for (var name in node.props) {
        setElementProp(element, name, node.props[name], isSVG);
      }
    }

    return element
  }

  function updateElement(element, oldProps, props, isSVG) {
    for (var name in copy(oldProps, props)) {
      if (
        props[name] !==
        (name === "value" || name === "checked"
          ? element[name]
          : oldProps[name])
      ) {
        setElementProp(element, name, props[name], isSVG, oldProps[name]);
      }
    }

    if (props.onupdate) {
      invokeLaterStack.push(function() {
        props.onupdate(element, oldProps);
      });
    }
  }

  function removeChildren(element, node, props) {
    if ((props = node.props)) {
      for (var i = 0; i < node.children.length; i++) {
        removeChildren(element.childNodes[i], node.children[i]);
      }

      if (props.ondestroy) {
        props.ondestroy(element);
      }
    }
    return element
  }

  function removeElement(parent, element, node, cb) {
    function done() {
      parent.removeChild(removeChildren(element, node));
    }

    if (node.props && (cb = node.props.onremove)) {
      cb(element, done);
    } else {
      done();
    }
  }

  function patch(parent, element, oldNode, node, isSVG, nextSibling) {
    if (node === oldNode) {
    } else if (oldNode == null) {
      element = parent.insertBefore(createElement(node, isSVG), element);
    } else if (node.name && node.name === oldNode.name) {
      updateElement(
        element,
        oldNode.props,
        node.props,
        (isSVG = isSVG || node.name === "svg")
      );

      var oldElements = [];
      var oldKeyed = {};
      var newKeyed = {};

      for (var i = 0; i < oldNode.children.length; i++) {
        oldElements[i] = element.childNodes[i];

        var oldChild = oldNode.children[i];
        var oldKey = getKey(oldChild);

        if (null != oldKey) {
          oldKeyed[oldKey] = [oldElements[i], oldChild];
        }
      }

      var i = 0;
      var j = 0;

      while (j < node.children.length) {
        var oldChild = oldNode.children[i];
        var newChild = node.children[j];

        var oldKey = getKey(oldChild);
        var newKey = getKey(newChild);

        if (newKeyed[oldKey]) {
          i++;
          continue
        }

        if (newKey == null) {
          if (oldKey == null) {
            patch(element, oldElements[i], oldChild, newChild, isSVG);
            j++;
          }
          i++;
        } else {
          var recyledNode = oldKeyed[newKey] || [];

          if (oldKey === newKey) {
            patch(element, recyledNode[0], recyledNode[1], newChild, isSVG);
            i++;
          } else if (recyledNode[0]) {
            patch(
              element,
              element.insertBefore(recyledNode[0], oldElements[i]),
              recyledNode[1],
              newChild,
              isSVG
            );
          } else {
            patch(element, oldElements[i], null, newChild, isSVG);
          }

          j++;
          newKeyed[newKey] = newChild;
        }
      }

      while (i < oldNode.children.length) {
        var oldChild = oldNode.children[i];
        if (getKey(oldChild) == null) {
          removeElement(element, oldElements[i], oldChild);
        }
        i++;
      }

      for (var i in oldKeyed) {
        if (!newKeyed[oldKeyed[i][1].props.key]) {
          removeElement(element, oldKeyed[i][0], oldKeyed[i][1]);
        }
      }
    } else if (node.name === oldNode.name) {
      element.nodeValue = node;
    } else {
      element = parent.insertBefore(
        createElement(node, isSVG),
        (nextSibling = element)
      );
      removeElement(parent, nextSibling, oldNode);
    }
    return element
  }
}

/**
 * 2018/2/1
 *
 * Copyright(c) Alibaba Group Holding Limited.
 *
 * Authors:
 *   乔杨 <peiqiao.ppq@alipay.com>
 */

function _default(_ref) {
  var x = _ref.x,
      y = _ref.y,
      size = _ref.size,
      key = _ref.key,
      extraClass = _ref.extraClass,
      _onclick = _ref.onclick;

  return h("div", {
    class: extraClass ? "tile " + extraClass : "tile",
    key: key,
    style: {
      left: x * size + "px",
      top: y * size + "px",
      width: size + "px",
      height: size + "px"
    },
    onclick: function onclick() {
      return _onclick(key);
    }
  });
}

/**
 * 2018/2/1
 *
 * Copyright(c) Alibaba Group Holding Limited.
 *
 * Authors:
 *   乔杨 <peiqiao.ppq@alipay.com>
 */

function TileContainer (_ref, actions) {
  var size = _ref.size,
      containerWidth = _ref.containerWidth,
      position = _ref.position,
      startIndex = _ref.startIndex,
      startClassName = _ref.startClassName,
      status = _ref.status;

  var shouldShowStartTile = status === "start" || status === "over";
  var children = position.map(function (v, key) {
    return _default({
      key: key,
      size: containerWidth / size,
      x: v % size,
      y: Math.floor(v / size),
      extraClass: shouldShowStartTile ? key === startIndex ? startClassName : null : null,
      onclick: function onclick(index) {
        return actions.pickTile(index);
      }
    });
  });
  return h("div", {
    class: "tile-container",
    style: {
      height: containerWidth + "px"
    }
  }, children);
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var __STYLE_TAG_ID = "__vision_style";

var DEFAULT_CONFIG = {
  size: 4,
  moveInterval: 800,
  moveDuration: 800,
  moveSteps: 5,
  startDelay: 1000,
  startClassName: "",
  startButtonText: "START !",
  retryButtonText: "RETRY !"
};

var Vision = function () {
  function Vision(config) {
    var _this = this;

    classCallCheck(this, Vision);

    this.config = Object.assign({}, DEFAULT_CONFIG, config);
    if (this.config.container instanceof HTMLElement === false) {
      throw new TypeError("Did you forget to pass a container to the constructor ?");
    }
    var containerWidth = this.config.container.getBoundingClientRect().width;
    if (containerWidth <= 0) {
      throw new Error("container must have a initial width.");
    }
    this.state = {
      size: this.config.size,
      containerWidth: containerWidth,
      status: "init",
      moving: false,
      startClassName: this.config.startClassName
    };
    this.actions = {
      initTilePosition: function initTilePosition() {
        return function (state) {
          var position = [];
          for (var i = 0; i < state.size * state.size; i++) {
            position.push(i);
          }
          return { position: position };
        };
      },
      randomTilePosition: function randomTilePosition(count) {
        return function (state) {
          var position = state.position;
          count = count || position.length;
          for (var i = 0; i < count; i++) {
            randomSwapArrayItem(position, Math.floor(Math.random() * position.length));
          }
          if (state.startIndex) {
            randomSwapArrayItem(position, state.startIndex);
          }
          console.debug("randomTilePosition", position);
          return { position: position };
        };
      },
      startGame: function startGame() {
        return function (state) {
          if (state.status === "init" || state.status === "over") {
            return {
              status: "start",
              startIndex: Math.floor(Math.random() * state.size * state.size)
            };
          }
          return {};
        };
      },
      startMoving: function startMoving() {
        return function (state) {
          return { status: "moving" };
        };
      },
      stopMoving: function stopMoving() {
        return function (state) {
          return { status: "waiting" };
        };
      },
      pickTile: function pickTile(index) {
        return function (state) {
          if (state.status !== "waiting") {
            return {};
          }
          var isWin = Number(index) === Number(state.startIndex);
          if (typeof _this.config.onGameOver === "function") {
            setTimeout(_this.config.onGameOver.bind(_this, isWin), 50);
          }
          return { isWin: isWin, status: "over" };
        };
      }
    };
    this._init();
  }

  createClass(Vision, [{
    key: "_init",
    value: function _init() {
      var _this2 = this;

      updateTileMoveSpeed(this.config.moveDuration / 1000);
      var view = function view(state, actions) {
        return h("div", { class: "game-container" }, [TileContainer(state, actions), h("div", {
          style: {
            display: state.status === "init" ? "block" : "none"
          },
          onclick: _this2.start.bind(_this2)
        }, _this2.config.startButtonText), h("div", {
          style: {
            display: state.status === "over" ? "block" : "none"
          },
          onclick: _this2.start.bind(_this2)
        }, _this2.config.retryButtonText)]);
      };
      this.app = app(this.state, this.actions, view, this.config.container);
      this.app.initTilePosition();
    }
  }, {
    key: "start",
    value: function start() {
      var _this3 = this;

      this.app.startGame();
      setTimeout(function () {
        _this3.app.startMoving();
        setTimeout(function () {
          _this3._move(_this3.config.moveSteps);
        }, _this3.config.startDelay);
      }, this.config.startDelay);
    }
  }, {
    key: "_move",
    value: function _move(countdown) {
      if (countdown <= 0) {
        this.app.stopMoving();
        return;
      }
      this.app.randomTilePosition();
      setTimeout(this._move.bind(this, countdown - 1), this.config.moveInterval);
    }
  }]);
  return Vision;
}();

/**
 * randomly swap array item
 * @param {Array} arr
 * @param {number} index
 */


function randomSwapArrayItem(arr, index) {
  var randomIndex = index;
  while (randomIndex === index) {
    randomIndex = Math.floor(Math.random() * arr.length);
  }
  var swap = arr[index];
  arr[index] = arr[randomIndex];
  arr[randomIndex] = swap;
  console.debug("swap", index, "->", randomIndex);
}

/**
 * update style
 * @param {number} second
 */
function updateTileMoveSpeed(second) {
  var style = document.getElementById(__STYLE_TAG_ID);
  var innerText = ".tile-container .tile { -webkit-transition: top " + second + "s, left " + second + "s; transition: top " + second + "s, left " + second + "s; }";
  if (style) {
    style.innerText = innerText;
  } else {
    var el = document.createElement("style");
    el.id = __STYLE_TAG_ID;
    el.innerText = innerText;
    el.type = "text/css";
    document.head.appendChild(el);
  }
}

return Vision;

})));
//# sourceMappingURL=index.js.map
