/**
 * 2018/2/1
 *
 * Copyright(c) Alibaba Group Holding Limited.
 *
 * Authors:
 *   乔杨 <peiqiao.ppq@alipay.com>
 */

"use strict";

import { h } from "hyperapp";

export default function({ x, y, size, key, extraClass, onclick }) {
  return h("div", {
    class: extraClass ? `tile ${extraClass}` : "tile",
    key,
    style: {
      left: x * size + "px",
      top: y * size + "px",
      width: size + "px",
      height: size + "px"
    },
    onclick: () => onclick(key)
  });
}
